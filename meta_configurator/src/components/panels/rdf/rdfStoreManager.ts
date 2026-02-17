import {readonly, ref, computed, watch, type Ref} from 'vue';
import {getDataForMode, useCurrentData} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import * as $rdf from 'rdflib';
import type {Path} from '@/utility/path';
import {useSettings} from '@/settings/useSettings';
import {RdfChangeType} from '@/components/panels/rdf/rdfUtils';

const settings = useSettings();

export type RdfChange = {
  type: RdfChangeType;
  oldStatement?: $rdf.Statement;
  newStatement?: $rdf.Statement;
};

export type RdfChangeCallback = (change: RdfChange) => void;

interface JsonLdDoc {
  '@context': any;
  '@graph': any[];
}

interface RdfStore {
  readonly store: Readonly<Ref<$rdf.IndexedFormula | null>>;
  readonly statements: Readonly<Ref<readonly $rdf.Statement[]>>;
  readonly namespaces: Readonly<Ref<Record<string, string>>>;
  readonly parseErrors: Readonly<Ref<readonly string[]>>;
  readonly parseWarnings: Readonly<Ref<readonly string[]>>;
  editStatement: (
    oldStatement: $rdf.Statement,
    newStatement: $rdf.Statement
  ) => {success: boolean; errorMessage: string};
  deleteStatement: (statement: $rdf.Statement) => {success: boolean; errorMessage: string};
  deleteStatementsBySubject: (subjectId: string) => {
    success: boolean;
    errorMessage: string;
    deleted: $rdf.Statement[];
  };
  addStatement: (
    statement: $rdf.Statement,
    isNewNode: boolean
  ) => {success: boolean; errorMessage: string};
  exportAs: (
    format: string,
    statements?: $rdf.Statement[]
  ) => {content: string; success: boolean; errorMessage: string};
  findMatchingStatementIndex: (path: Path) => Promise<number>;
  statementAsJsonLd: (statement: $rdf.Statement) => string | undefined;
  containsSubject: (statement: $rdf.Statement) => boolean;
  containsPredicate: (statement: $rdf.Statement) => boolean;
  allPredicate: (statement: $rdf.Statement) => any;
  getObject: (statement: $rdf.Statement) => any;
  getStatementsBySubject: (subjectId: string) => $rdf.Statement[];
}

export const rdfStoreManager: RdfStore & {
  onChange: (cb: RdfChangeCallback) => () => void;
} = (() => {
  const _jsonLdText = ref<string>('');
  const _jsonObject = ref<any>(null);
  const callbacks = new Set<RdfChangeCallback>();
  const _store = ref<$rdf.IndexedFormula | null>(null);
  const _statements = ref<$rdf.Statement[]>([]);
  const _parseErrors = ref<string[]>([]);
  const _parseWarnings = ref<string[]>([]);
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
    _parseWarnings.value = [];
    const all = [..._store.value!.statements];
    const max = settings.value.rdf.maximumTriplesToShow;
    _statements.value = all.length > max ? all.slice(0, max) : all;
    if (all.length > max) {
      _parseWarnings.value = [
        `The number of triples (${all.length}) exceeds the maximum limit (${max}). Only the first ${max} triples are shown.
        You can adjust this limit in the settings.`,
      ];
    }
  };

  const deleteStatement = (statement: $rdf.Statement): {success: boolean; errorMessage: string} => {
    // return {success: true, errorMessage: 'Store is not initialized.'};
    if (!_store.value) {
      return {success: false, errorMessage: 'Store is not initialized.'};
    }
    if (!statement) {
      return {success: false, errorMessage: 'No statement provided.'};
    }

    try {
      _store.value.removeStatement(statement);
      updateStatements();
      callbacks.forEach(cb => cb({type: RdfChangeType.Delete, oldStatement: statement}));
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message || 'Unknown error occurred.'};
    }
  };

  const deleteStatementsBySubject = (
    subjectId: string
  ): {success: boolean; errorMessage: string; deleted: $rdf.Statement[]} => {
    if (!_store.value) {
      return {success: false, errorMessage: 'Store is not initialized.', deleted: []};
    }
    if (!subjectId) {
      return {success: false, errorMessage: 'No subject provided.', deleted: []};
    }

    const toDelete = _store.value.statements.filter(st => st.subject.value === subjectId);
    if (toDelete.length === 0) {
      return {success: true, errorMessage: '', deleted: []};
    }

    try {
      for (const st of toDelete) {
        _store.value.removeStatement(st);
      }
      updateStatements();
      for (const st of toDelete) {
        callbacks.forEach(cb => cb({type: RdfChangeType.Delete, oldStatement: st}));
      }
      return {success: true, errorMessage: '', deleted: toDelete};
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error.message || 'Unknown error occurred.',
        deleted: [],
      };
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
      callbacks.forEach(cb => cb({type: RdfChangeType.Edit, oldStatement, newStatement}));
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
      callbacks.forEach(cb => cb({type: RdfChangeType.Add, newStatement: statement}));
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
    format: string,
    statements?: $rdf.Statement[]
  ): {content: string | undefined; success: boolean; errorMessage: string} => {
    let serialized: string | undefined = '';
    if (!_store.value) {
      return {content: '', success: false, errorMessage: 'Store is not initialized.'};
    }
    if (statements) {
      const tempStore = $rdf.graph();
      const namespaces = _store.value.namespaces ?? {};
      Object.entries(namespaces).forEach(([prefix, iri]) => {
        tempStore.setPrefixForURI(prefix, iri);
      });
      statements.forEach(st => tempStore.add(st));
      serialized = $rdf.serialize(null, tempStore as $rdf.Formula, 'http://example.org/', format);
    } else {
      serialized = $rdf.serialize(
        null,
        _store.value as $rdf.Formula,
        'http://example.org/',
        format
      );
    }

    return {content: serialized, success: true, errorMessage: ''};
  };

  const onChange = (cb: RdfChangeCallback) => {
    callbacks.add(cb);
    return () => callbacks.delete(cb);
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

  const getStatementsBySubject = (subjectId: string): $rdf.Statement[] => {
    if (!_store.value) {
      return [];
    }
    return _store.value.statements.filter(st => st.subject.value === subjectId);
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

  const rebuildStoreFromEditorData = async (data: any) => {
    if (!data) return;

    _jsonLdText.value = JSON.stringify(data, null, 2);
    clearStore();

    _jsonObject.value = JSON.parse(_jsonLdText.value);
    applyContextPrefixes(_jsonObject.value);

    await parseJsonLdIntoStore(_jsonLdText.value);
    updateStatements();
  };

  watch(
    () => getDataForMode(SessionMode.DataEditor).data.value,
    async data => {
      await rebuildStoreFromEditorData(data);
    }
  );

  watch(
    () => settings.value.rdf.maximumTriplesToShow,
    async () => {
      const data = getDataForMode(SessionMode.DataEditor).data.value;
      await rebuildStoreFromEditorData(data);
    }
  );

  return {
    store: readonly(_store),
    statements: readonly(_statements),
    namespaces: readonly(namespaces),
    parseErrors: readonly(_parseErrors),
    parseWarnings: readonly(_parseWarnings),
    editStatement,
    deleteStatement,
    deleteStatementsBySubject,
    addStatement,
    onChange,
    exportAs,
    findMatchingStatementIndex,
    statementAsJsonLd,
    containsSubject,
    containsPredicate,
    allPredicate,
    getObject,
    getStatementsBySubject,
  } as RdfStore & {onChange: (cb: RdfChangeCallback) => () => void};
})();
