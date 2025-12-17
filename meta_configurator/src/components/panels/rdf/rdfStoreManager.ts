import {readonly, ref, computed, watch, type Ref} from 'vue';
import {getDataForMode, useCurrentData} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import * as $rdf from 'rdflib';
import type {Path} from '@/utility/path';

type RdfChangeCallback = (oldStore: string, newStore: string) => void;

interface JsonLdDoc {
  '@context': any;
  '@graph': any[];
}

interface RdfStore {
  readonly statements: Readonly<Ref<readonly $rdf.Statement[]>>;
  readonly namespaces: Readonly<Ref<Record<string, string>>>;
  readonly parseErrors: Readonly<Ref<string[]>>;
  query: (
    sparql: string,
    onRow: (row: Record<string, string>) => void,
    onDone?: (columns: string[]) => void
  ) => void;
  deleteStatement: (stmts: $rdf.Statement) => {success: boolean; errorMessage: string};
  addStatement: (stmts: $rdf.Statement) => {success: boolean; errorMessage: string};
  exportAs: (format: string) => {content: string; success: boolean; errorMessage: string};
  findMatchingStatementIndex: (path: Path) => Promise<number>;
}

export const rdfStoreManager: RdfStore & {
  onChange: (cb: RdfChangeCallback) => void;
} = (() => {
  const callbacks: RdfChangeCallback[] = [];
  const _store = ref<$rdf.IndexedFormula | null>(null);
  const _statements = ref<$rdf.Statement[]>([]);
  const _parseErrors = ref<string[]>([]);

  const _namespaces = computed<Record<string, string>>(() => {
    if (!_store.value) return {};
    return {..._store.value.namespaces};
  });

  const setJsonLdText = (jsonLdObj: any) => {
    return JSON.stringify(jsonLdObj, null, 2);
  };

  const clearStore = () => {
    _store.value = $rdf.graph();
  };

  const applyContextPrefixes = (parsed: any) => {
    if (!parsed['@context']) return;

    for (const [prefix, ns] of Object.entries(parsed['@context'])) {
      if (typeof ns === 'string') {
        _store.value!.setPrefixForURI(prefix, ns);
      }
    }
  };

  const parseJsonLdIntoStore = async (jsonLdText: string) => {
    const baseUri = 'http://example.org/';
    _parseErrors.value = [];
    try {
      await new Promise<void>((resolve, reject) => {
        $rdf.parse(
          jsonLdText,
          _store.value as $rdf.Formula,
          baseUri,
          'application/ld+json',
          err => {
            if (err) {
              const msg = err.message || String(err);
              _parseErrors.value.push(msg);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (!_parseErrors.value.includes(msg)) {
        _parseErrors.value.push(msg);
      }
    }
  };

  const updateStatements = () => {
    _statements.value = [..._store.value!.statements];
  };

  const deleteStatement = (statement: $rdf.Statement): {success: boolean; errorMessage: string} => {
    if (!_store.value) {
      return {success: false, errorMessage: 'Store is not initialized.'};
    }
    if (!statement) {
      return {success: false, errorMessage: 'No statement provided.'};
    }

    try {
      _store.value.removeStatement(statement);
      updateStatements();
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message || 'Unknown error occurred.'};
    }
  };

  const addStatement = (statement: $rdf.Statement): {success: boolean; errorMessage: string} => {
    if (!_store.value) {
      return {success: false, errorMessage: 'Store is not initialized.'};
    }
    if (!statement) {
      return {success: false, errorMessage: 'No statement provided.'};
    }

    try {
      _store.value.add(statement);
      updateStatements();
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message || 'Unknown error occurred.'};
    }
  };

  const exportAs = (
    format: string
  ): {content: string | undefined; success: boolean; errorMessage: string} => {
    if (!_store.value) {
      return {content: '', success: false, errorMessage: 'Store is not initialized.'};
    }
    const serialized = $rdf.serialize(
      null,
      _store.value as $rdf.Formula,
      'http://example.org/',
      format
    );
    return {content: serialized, success: true, errorMessage: ''};
  };

  const onChange = (cb: RdfChangeCallback) => {
    callbacks.push(cb);
  };

  const findMatchingStatementIndex = async (path: Path): Promise<number> => {
    const jsonLdObj = extractJsonLdByPath(path);
    if (!jsonLdObj) {
      return -1;
    }
    const tempStore = $rdf.graph();
    const baseUri = 'http://example.org/';
    await new Promise<void>((resolve, reject) => {
      $rdf.parse(
        JSON.stringify(jsonLdObj, null, 2),
        tempStore as $rdf.Formula,
        baseUri,
        'application/ld+json'
      );
    });
    if (tempStore.statements.length !== 1) {
      return -1;
    }
    const idx = findStatementIndex(tempStore.statements[0]!);
    return idx !== -1 ? idx : -1;
  };

  const query = (
    sparql: string,
    onRow: (row: Record<string, string>) => void,
    onDone?: (columns: string[]) => void
  ): void => {
    const queryObj = $rdf.SPARQLToQuery(sparql, false, _store.value);
    if (!queryObj) return;
    const rows: Record<string, string>[] = [];
    _store.value!.query(
      queryObj,
      bindings => {
        const row: Record<string, string> = {};
        for (const key in bindings) {
          row[key] = bindings[key]!.value;
        }
        rows.push(row);
        onRow(row);
      },
      undefined,
      () => {
        const columns = queryObj.vars.length
          ? queryObj.vars.map(v => `?${v.label}`)
          : rows.length
          ? Object.keys(rows[0]!)
          : [];
        onDone?.(columns);
      }
    );
  };

  function extractJsonLdByPath(path: Path): JsonLdDoc | undefined {
    const jsonld = useCurrentData().data.value;

    if (path.length < 3 || path[0] !== '@graph') {
      return undefined;
    }

    const [, graphIndex, predicate, arrayIndex] = path;

    if (typeof graphIndex !== 'number' || typeof predicate !== 'string') {
      return undefined;
    }

    const subjectNode = jsonld['@graph']?.[graphIndex];
    if (!subjectNode) {
      return undefined;
    }

    let value = subjectNode[predicate];
    if (value === undefined) {
      return undefined;
    }

    if (arrayIndex !== undefined) {
      if (!Array.isArray(value) || typeof arrayIndex !== 'number') {
        return undefined;
      }
      value = value[arrayIndex];
      if (value === undefined) {
        return undefined;
      }
    }

    return {
      '@context': jsonld['@context'],
      '@graph': [
        {
          '@id': subjectNode['@id'],
          [predicate]: value,
        },
      ],
    };
  }

  function findStatementIndex(statement: $rdf.Statement): number {
    const statements = rdfStoreManager.statements.value;
    const index = statements.findIndex(
      st =>
        st.subject.value === statement.subject.value &&
        st.predicate.value === statement.predicate.value &&
        st.object.value === statement.object.value
    );
    return index >= 0 ? index : -1;
  }

  watch(
    () => getDataForMode(SessionMode.DataEditor).data.value,
    async data => {
      if (!data) return;

      const jsonLdText = setJsonLdText(data);
      clearStore();

      const parsed = JSON.parse(jsonLdText);
      applyContextPrefixes(parsed);

      await parseJsonLdIntoStore(jsonLdText);
      updateStatements();
    }
  );

  return {
    statements: readonly(_statements),
    namespaces: readonly(_namespaces),
    parseErrors: readonly(_parseErrors),
    query,
    deleteStatement,
    addStatement,
    onChange,
    exportAs,
    findMatchingStatementIndex,
  } as RdfStore & {onChange: (cb: RdfChangeCallback) => void};
})();
