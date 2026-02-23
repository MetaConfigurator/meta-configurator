import {readonly, ref, computed, watch, type Ref} from 'vue';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import * as $rdf from 'rdflib';
import type {Path} from '@/utility/path';
import {jsonLdManager} from '@/components/panels/rdf/jsonLdManager';
import {useSettings} from '@/settings/useSettings';
import {RdfChangeType, RdfTermType} from '@/components/panels/rdf/rdfUtils';

const settings = useSettings();

export type RdfChange = {
  type: RdfChangeType;
  oldStatement?: $rdf.Statement;
  newStatement?: $rdf.Statement;
};

export type RdfChangeCallback = (change: RdfChange) => void;

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
  renameSubjectNode: (oldId: string, newId: string) => {success: boolean; errorMessage: string};
  addStatement: (
    statement: $rdf.Statement,
    isNewNode: boolean
  ) => {success: boolean; errorMessage: string};
  exportAs: (
    format: string,
    statements?: $rdf.Statement[]
  ) => {content: string; success: boolean; errorMessage: string};
  findMatchingStatementIndex: (path: Path) => Promise<number>;
  containsSubject: (statement: $rdf.Statement) => boolean;
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

  const renameSubjectNode = (
    oldId: string,
    newId: string
  ): {success: boolean; errorMessage: string} => {
    if (!_store.value) {
      return {success: false, errorMessage: 'Store is not initialized.'};
    }
    if (!oldId || !newId) {
      return {success: false, errorMessage: 'Invalid node IRI.'};
    }
    if (oldId === newId) {
      return {success: true, errorMessage: ''};
    }

    const hasConflict = _store.value.statements.some(st => st.subject.value === newId);
    if (hasConflict) {
      return {success: false, errorMessage: 'A node with this IRI already exists.'};
    }

    const affected = _store.value.statements.filter(
      st =>
        st.subject.value === oldId ||
        (st.object.termType === RdfTermType.NamedNode && st.object.value === oldId)
    );

    if (affected.length === 0) {
      return {success: true, errorMessage: ''};
    }

    for (const st of affected) {
      const delResult = deleteStatement(st);
      if (!delResult.success) {
        return delResult;
      }
    }

    for (const st of affected) {
      const subject = st.subject.value === oldId ? $rdf.sym(newId) : st.subject;
      const object =
        st.object.termType === RdfTermType.NamedNode && st.object.value === oldId
          ? $rdf.sym(newId)
          : st.object;
      const newStatement = $rdf.st(subject, st.predicate, object, st.graph);
      const addResult = addStatement(newStatement, false);
      if (!addResult.success) {
        return addResult;
      }
    }

    return {success: true, errorMessage: ''};
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
    const jsonLdObj = jsonLdManager.extractJsonLdByPath(path);
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

  const containsSubject = (statement: $rdf.Statement): boolean => {
    if (!_store.value) {
      return false;
    }

    return _store.value.statements.some(st => st.subject.value === statement.subject.value);
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
    renameSubjectNode,
    addStatement,
    onChange,
    exportAs,
    findMatchingStatementIndex,
    containsSubject,
    getStatementsBySubject,
  } as RdfStore & {onChange: (cb: RdfChangeCallback) => () => void};
})();
