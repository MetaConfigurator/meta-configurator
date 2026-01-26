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
    onDone?: (columns: string[]) => void,
    onStatementsDone?: (statements: $rdf.Statement[]) => void
  ) => void;
  editStatement: (
    oldStatement: $rdf.Statement,
    newStatement: $rdf.Statement
  ) => {success: boolean; errorMessage: string};
  deleteStatement: (statement: $rdf.Statement) => {success: boolean; errorMessage: string};
  addStatement: (
    statement: $rdf.Statement,
    isNewNode: boolean
  ) => {success: boolean; errorMessage: string};
  exportAs: (format: string) => {content: string; success: boolean; errorMessage: string};
  findMatchingStatementIndex: (path: Path) => Promise<number>;
  statementAsJsonLd: (statement: $rdf.Statement) => string | undefined;
  containsSubject: (statement: $rdf.Statement) => boolean;
  containsPredicate: (statement: $rdf.Statement) => boolean;
  allPredicate: (statement: $rdf.Statement) => any;
  getObject: (statement: $rdf.Statement) => any;
}

export const rdfStoreManager: RdfStore & {
  onChange: (cb: RdfChangeCallback) => void;
} = (() => {
  const _jsonLdText = ref<string>('');
  const _jsonObject = ref<any>(null);
  const callbacks: RdfChangeCallback[] = [];
  const _store = ref<$rdf.IndexedFormula | null>(null);
  const _statements = ref<$rdf.Statement[]>([]);
  const _parseErrors = ref<string[]>([]);

  const namespaces = computed<Record<string, string>>(() => {
    if (!_store.value) return {};
    return {..._store.value.namespaces};
  });

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

  const editStatement = (
    oldStatement: $rdf.Statement,
    newStatement: $rdf.Statement
  ): {success: boolean; errorMessage: string} => {
    if (!_store.value) {
      return {success: false, errorMessage: 'Store is not initialized.'};
    }

    try {
      _store.value.removeStatement(oldStatement);
      _store.value.add(newStatement);
      updateStatements();
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message || 'Unknown error occurred.'};
    }
  };

  const addStatement = (
    statement: $rdf.Statement,
    isNewNode: boolean
  ): {success: boolean; errorMessage: string} => {
    if (!_store.value) {
      return {success: false, errorMessage: 'Store is not initialized.'};
    }
    if (!statement) {
      return {success: false, errorMessage: 'No statement provided.'};
    }

    if (isNewNode) {
      if (containsSubject(statement)) {
        return {success: false, errorMessage: 'Subject already exists in the store.'};
      }
    }
    try {
      _store.value.add(statement);
      updateStatements();
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message || 'Unknown error occurred.'};
    }
  };

  const statementAsJsonLd = (statement: $rdf.Statement): string | undefined => {
    const tempStore = $rdf.graph();
    tempStore.add(statement);
    const serialized = $rdf.serialize(
      null,
      tempStore,
      undefined,
      'application/ld+json',
      undefined,
      {namespaces: namespaces.value}
    );

    return serialized;
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
        'application/ld+json',
        _ => {
          resolve();
        }
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
    onDone?: (columns: string[]) => void,
    onStatementsDone?: (statements: $rdf.Statement[]) => void
  ): void => {
    const queryObj = $rdf.SPARQLToQuery(sparql, false, _store.value);
    if (!queryObj) return;

    const rows: Record<string, string>[] = [];
    const statements: $rdf.Statement[] = [];

    const toStatementIfPossible = (bindings: any): $rdf.Statement | null => {
      const s = bindings['?subject'];
      const p = bindings['?predicate'];
      const o = bindings['?object'];

      if (!s || !p || !o) return null;
      return new $rdf.Statement(s, p, o);
    };

    _store.value!.query(
      queryObj,
      (bindings: any) => {
        const row: Record<string, string> = {};
        for (const key in bindings) {
          row[key] = bindings[key]?.value ?? String(bindings[key]);
        }
        rows.push(row);
        onRow(row);
        if (onStatementsDone) {
          const stmt = toStatementIfPossible(bindings);
          if (stmt) {
            statements.push(stmt);
          }
        }
      },
      undefined,
      () => {
        const columns =
          rows.length > 0
            ? Object.keys(rows[0]!)
            : queryObj.vars.length
            ? queryObj.vars.map((v: any) => `?${v.label}`)
            : [];
        onDone?.(columns);
        if (onStatementsDone) {
          onStatementsDone(statements);
        }
      }
    );
  };

  function extractJsonLdByPath(path: Path): JsonLdDoc | undefined {
    const jsonld = useCurrentData().data.value;

    if (path.length < 3 || path[0] !== '@graph') {
      return undefined;
    }

    const [, graphIndex, predicate, object] = path;

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

    if (object !== undefined && typeof object === 'number') {
      value = value[object];
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

  const containsSubject = (statement: $rdf.Statement): boolean => {
    if (!_store.value) {
      return false;
    }

    return _store.value.statements.some(st => st.subject.value === statement.subject.value);
  };

  const containsPredicate = (statement: $rdf.Statement): boolean => {
    if (!_store.value) {
      return false;
    }

    return _store.value.statements.some(
      st =>
        st.subject.value === statement.subject.value &&
        st.predicate.value === statement.predicate.value
    );
  };

  const allPredicate = (statement: $rdf.Statement): any => {
    if (!_store.value) {
      return false;
    }

    return _store.value.statements.find(
      st =>
        st.subject.value === statement.subject.value &&
        st.predicate.value === statement.predicate.value
    );
  };

  const getObject = (statement: $rdf.Statement): string | string[] | undefined => {
    if (!_store.value) {
      return undefined;
    }
    const values = _store.value.statements
      .filter(
        st =>
          st.subject.value === statement.subject.value &&
          st.predicate.value === statement.predicate.value
      )
      .map(st => st.object.value);

    if (values.length === 0) {
      return undefined;
    }

    if (values.length === 1) {
      return values[0];
    }

    return values;
  };

  function findStatementIndex(statement: $rdf.Statement): number {
    const index = rdfStoreManager.statements.value.findIndex(
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

      _jsonLdText.value = JSON.stringify(data, null, 2);
      clearStore();

      _jsonObject.value = JSON.parse(_jsonLdText.value);
      applyContextPrefixes(_jsonObject.value);

      await parseJsonLdIntoStore(_jsonLdText.value);
      updateStatements();
    }
  );

  return {
    statements: readonly(_statements),
    namespaces: readonly(namespaces),
    parseErrors: readonly(_parseErrors),
    query,
    editStatement,
    deleteStatement,
    addStatement,
    onChange,
    exportAs,
    findMatchingStatementIndex,
    statementAsJsonLd,
    containsSubject,
    containsPredicate,
    allPredicate,
    getObject,
  } as RdfStore & {onChange: (cb: RdfChangeCallback) => void};
})();
