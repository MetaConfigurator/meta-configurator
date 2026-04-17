import {readonly, ref, computed, watch, type Ref} from 'vue';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import * as $rdf from 'rdflib';
import jsonld from 'jsonld';
import type {Path} from '@/utility/path';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {useSettings} from '@/settings/useSettings';
import {RdfChangeType, RdfTermType} from '@/components/panels/rdf/rdfUtils';
import {RdfMediaType} from '@/components/panels/rdf/rdfEnums';

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

const settings = useSettings();
const jsonLdContextCache: Record<string, any> = {};
let isJsonLdDocumentLoaderConfigured = false;

function configureJsonLdDocumentLoaderCache() {
  if (isJsonLdDocumentLoaderConfigured) return;

  const {documentLoaders} = jsonld as any;
  const createBaseLoader = documentLoaders?.node ?? documentLoaders?.xhr ?? null;

  if (!createBaseLoader) return;

  const baseLoader = createBaseLoader();
  (jsonld as any).documentLoader = async (url: string, options?: any) => {
    if (!jsonLdContextCache[url]) {
      jsonLdContextCache[url] = await baseLoader(url, options);
    }
    return jsonLdContextCache[url];
  };

  isJsonLdDocumentLoaderConfigured = true;
}

export const rdfStoreManager: RdfStore & {
  onChange: (cb: RdfChangeCallback) => () => void;
} = (() => {
  const _store = ref<$rdf.IndexedFormula | null>(null);
  const _statements = ref<$rdf.Statement[]>([]);
  const _parseErrors = ref<string[]>([]);
  const _parseWarnings = ref<string[]>([]);
  const _callbacks = new Set<RdfChangeCallback>();

  const namespaces = computed<Record<string, string>>(() =>
    _store.value ? {..._store.value.namespaces} : {}
  );

  function notify(change: RdfChange) {
    _callbacks.forEach(cb => cb(change));
  }

  function clearStore() {
    _store.value = $rdf.graph();
    // Materialize RDF collections as rdf:first/rdf:rest triples instead of rdflib Collection terms.
    if (_store.value.rdfFactory?.supports) {
      _store.value.rdfFactory.supports.COLLECTIONS = false;
    }
  }

  function updateStatements() {
    _parseWarnings.value = [];
    const all = [..._store.value!.statements];
    const max = settings.value.rdf.maximumTriplesToShow;

    if (all.length > max) {
      _statements.value = all.slice(0, max);
      _parseWarnings.value = [
        `The number of triples (${all.length}) exceeds the maximum limit (${max}). ` +
          `Only the first ${max} triples are shown. You can adjust this limit in the settings.`,
      ];
    } else {
      _statements.value = all;
    }
  }

  async function applyContextPrefixes(parsed: any) {
    const ctx = parsed?.['@context'];
    if (!ctx) return;

    const contexts = Array.isArray(ctx) ? ctx : [ctx];

    for (const part of contexts) {
      if (!part || typeof part !== 'object') continue;
      for (const [prefix, ns] of Object.entries(part)) {
        if (typeof ns === 'string') {
          _store.value!.setPrefixForURI(prefix, ns);
        }
      }
    }
  }

  async function parseRdfText(jsonLdText: string): Promise<void> {
    return new Promise((resolve, reject) => {
      $rdf.parse(
        jsonLdText,
        _store.value as $rdf.Formula,
        settings.value.rdf.baseUri,
        RdfMediaType.JsonLd,
        err => (err ? reject(err) : resolve())
      );
    });
  }

  async function parseJsonLdIntoStore(jsonLdText: string) {
    _parseErrors.value = [];
    configureJsonLdDocumentLoaderCache();

    try {
      await parseRdfText(jsonLdText);
    } catch (error: any) {
      const msg = error?.message ?? String(error);
      if (!_parseErrors.value.includes(msg)) {
        _parseErrors.value.push(msg);
      }
    }
  }

  function editStatement(
    oldStatement: $rdf.Statement,
    newStatement: $rdf.Statement
  ): {success: boolean; errorMessage: string} {
    if (!_store.value) return {success: false, errorMessage: 'Store is not initialized.'};

    try {
      _store.value.removeStatement(oldStatement);
      _store.value.add(newStatement);
      updateStatements();
      notify({type: RdfChangeType.Edit, oldStatement, newStatement});
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message ?? 'Unknown error occurred.'};
    }
  }

  function deleteStatement(statement: $rdf.Statement): {success: boolean; errorMessage: string} {
    if (!_store.value) return {success: false, errorMessage: 'Store is not initialized.'};
    if (!statement) return {success: false, errorMessage: 'No statement provided.'};

    try {
      _store.value.removeStatement(statement);
      updateStatements();
      notify({type: RdfChangeType.Delete, oldStatement: statement});
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message ?? 'Unknown error occurred.'};
    }
  }

  function deleteStatementsBySubject(subjectId: string): {
    success: boolean;
    errorMessage: string;
    deleted: $rdf.Statement[];
  } {
    if (!_store.value)
      return {success: false, errorMessage: 'Store is not initialized.', deleted: []};
    if (!subjectId) return {success: false, errorMessage: 'No subject provided.', deleted: []};

    const toDelete = _store.value.statements.filter(st => st.subject.value === subjectId);
    if (toDelete.length === 0) return {success: true, errorMessage: '', deleted: []};

    try {
      for (const st of toDelete) {
        _store.value.removeStatement(st);
      }
      updateStatements();
      for (const st of toDelete) {
        notify({type: RdfChangeType.Delete, oldStatement: st});
      }
      return {success: true, errorMessage: '', deleted: toDelete};
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error.message ?? 'Unknown error occurred.',
        deleted: [],
      };
    }
  }

  function addStatement(
    statement: $rdf.Statement,
    isNewNode: boolean
  ): {success: boolean; errorMessage: string} {
    if (!_store.value) return {success: false, errorMessage: 'Store is not initialized.'};
    if (!statement) return {success: false, errorMessage: 'No statement provided.'};

    if (isNewNode && containsSubject(statement)) {
      return {success: false, errorMessage: 'Subject already exists in the store.'};
    }

    try {
      _store.value.add(statement);
      updateStatements();
      notify({type: RdfChangeType.Add, newStatement: statement});
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message ?? 'Unknown error occurred.'};
    }
  }

  function renameSubjectNode(
    oldId: string,
    newId: string
  ): {success: boolean; errorMessage: string} {
    if (!_store.value) return {success: false, errorMessage: 'Store is not initialized.'};
    if (!oldId || !newId) return {success: false, errorMessage: 'Invalid node IRI.'};
    if (oldId === newId) return {success: true, errorMessage: ''};

    const hasConflict = _store.value.statements.some(st => st.subject.value === newId);
    if (hasConflict) return {success: false, errorMessage: 'A node with this IRI already exists.'};

    const affected = _store.value.statements.filter(
      st =>
        st.subject.value === oldId ||
        (st.object.termType === RdfTermType.NamedNode && st.object.value === oldId)
    );

    if (affected.length === 0) return {success: true, errorMessage: ''};

    for (const st of affected) {
      const delResult = deleteStatement(st);
      if (!delResult.success) return delResult;
    }

    for (const st of affected) {
      const subject = st.subject.value === oldId ? $rdf.sym(newId) : st.subject;
      const object =
        st.object.termType === RdfTermType.NamedNode && st.object.value === oldId
          ? $rdf.sym(newId)
          : st.object;
      const addResult = addStatement($rdf.st(subject, st.predicate, object, st.graph), false);
      if (!addResult.success) return addResult;
    }

    return {success: true, errorMessage: ''};
  }

  function buildTempStore(statements: $rdf.Statement[]): $rdf.IndexedFormula {
    const tempStore = $rdf.graph();
    const namespaces = _store.value?.namespaces ?? {};
    for (const [prefix, iri] of Object.entries(namespaces)) {
      tempStore.setPrefixForURI(prefix, iri);
    }
    statements.forEach(st => tempStore.add(st));
    return tempStore;
  }

  function serializeStore(store: $rdf.IndexedFormula, format: string): string | undefined {
    return $rdf.serialize(null, store as $rdf.Formula, settings.value.rdf.baseUri, format);
  }

  function exportAs(
    format: string,
    statements?: $rdf.Statement[]
  ): {content: string | undefined; success: boolean; errorMessage: string} {
    if (!_store.value)
      return {content: '', success: false, errorMessage: 'Store is not initialized.'};

    const targetStore = statements ? buildTempStore(statements) : _store.value;
    const content = serializeStore(targetStore as $rdf.IndexedFormula, format);

    return {content, success: true, errorMessage: ''};
  }

  function findStatementIndex(statement: $rdf.Statement): number {
    return _statements.value.findIndex(
      st =>
        st.subject.value === statement.subject.value &&
        st.predicate.value === statement.predicate.value &&
        st.object.value === statement.object.value
    );
  }

  async function findMatchingStatementIndex(path: Path): Promise<number> {
    const jsonLdObj = jsonLdNodeManager.extractJsonLdByPath(path);
    if (!jsonLdObj) return -1;

    const tempStore = $rdf.graph();
    await new Promise<void>(resolve => {
      $rdf.parse(
        JSON.stringify(jsonLdObj, null, 2),
        tempStore as $rdf.Formula,
        settings.value.rdf.baseUri,
        RdfMediaType.JsonLd,
        () => resolve()
      );
    });

    if (tempStore.statements.length !== 1) return -1;
    return findStatementIndex(tempStore.statements[0]!);
  }

  function containsSubject(statement: $rdf.Statement): boolean {
    return (
      _store.value?.statements.some(st => st.subject.value === statement.subject.value) ?? false
    );
  }

  function getStatementsBySubject(subjectId: string): $rdf.Statement[] {
    return _store.value?.statements.filter(st => st.subject.value === subjectId) ?? [];
  }

  async function rebuildStoreFromEditorData(data: any) {
    if (!data) return;

    const jsonLdText = JSON.stringify(data, null, 2);
    const jsonObject = JSON.parse(jsonLdText);

    clearStore();
    await applyContextPrefixes(jsonObject);
    await parseJsonLdIntoStore(jsonLdText);
    updateStatements();
  }

  watch(
    () => getDataForMode(SessionMode.DataEditor).data.value,
    data => rebuildStoreFromEditorData(data)
  );

  watch(
    () => settings.value.rdf.maximumTriplesToShow,
    () => rebuildStoreFromEditorData(getDataForMode(SessionMode.DataEditor).data.value)
  );

  const onChange = (cb: RdfChangeCallback) => {
    _callbacks.add(cb);
    return () => _callbacks.delete(cb);
  };

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
