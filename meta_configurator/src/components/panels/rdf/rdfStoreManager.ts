import {readonly, ref, computed, watch, type Ref} from 'vue';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import * as $rdf from 'rdflib';

type RdfChangeCallback = (oldStore: string, newStore: string) => void;

interface RdfStore {
  readonly store: Readonly<Ref<$rdf.IndexedFormula>>;
  readonly statements: Readonly<Ref<readonly $rdf.Statement[]>>;
  readonly namespaces: Readonly<Ref<Record<string, string>>>;
  readonly parseErrors: Readonly<Ref<string[]>>;
  deleteStatement: (stmts: $rdf.Statement) => {success: boolean; errorMessage: string};
  addStatement: (stmts: $rdf.Statement) => {success: boolean; errorMessage: string};
  exportAs: (format: string) => {content: string; success: boolean; errorMessage: string};
}

export const rdfStoreManager: RdfStore & {
  onChange: (cb: RdfChangeCallback) => void;
} = (() => {
  const callbacks: RdfChangeCallback[] = [];
  const store = ref<$rdf.IndexedFormula | null>(null);
  const _statements = ref<$rdf.Statement[]>([]);
  const _parseErrors = ref<string[]>([]);

  const _namespaces = computed<Record<string, string>>(() => {
    if (!store.value) return {};
    return {...store.value.namespaces};
  });

  const setJsonLdText = (jsonLdObj: any) => {
    return JSON.stringify(jsonLdObj, null, 2);
  };

  const clearStore = () => {
    store.value = $rdf.graph();
  };

  const applyContextPrefixes = (parsed: any) => {
    if (!parsed['@context']) return;

    for (const [prefix, ns] of Object.entries(parsed['@context'])) {
      if (typeof ns === 'string') {
        store.value!.setPrefixForURI(prefix, ns);
      }
    }
  };

  const parseJsonLdIntoStore = async (jsonLdText: string) => {
    const baseUri = 'http://example.org/';
    _parseErrors.value = [];
    try {
      await new Promise<void>((resolve, reject) => {
        $rdf.parse(jsonLdText, store.value as $rdf.Formula, baseUri, 'application/ld+json', err => {
          if (err) {
            const msg = err.message || String(err);
            _parseErrors.value.push(msg);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (!_parseErrors.value.includes(msg)) {
        _parseErrors.value.push(msg);
      }
    }
  };

  const updateStatements = () => {
    _statements.value = [...store.value!.statements];
  };

  const deleteStatement = (statement: $rdf.Statement): {success: boolean; errorMessage: string} => {
    if (!store.value) {
      return {success: false, errorMessage: 'Store is not initialized.'};
    }
    if (!statement) {
      return {success: false, errorMessage: 'No statement provided.'};
    }

    try {
      store.value.removeStatement(statement);
      updateStatements();
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message || 'Unknown error occurred.'};
    }
  };

  const addStatement = (statement: $rdf.Statement): {success: boolean; errorMessage: string} => {
    if (!store.value) {
      return {success: false, errorMessage: 'Store is not initialized.'};
    }
    if (!statement) {
      return {success: false, errorMessage: 'No statement provided.'};
    }

    try {
      store.value.add(statement);
      updateStatements();
      return {success: true, errorMessage: ''};
    } catch (error: any) {
      return {success: false, errorMessage: error.message || 'Unknown error occurred.'};
    }
  };

  const exportAs = (
    format: string
  ): {content: string | undefined; success: boolean; errorMessage: string} => {
    if (!store.value) {
      return {content: '', success: false, errorMessage: 'Store is not initialized.'};
    }
    const serialized = $rdf.serialize(
      null,
      store.value as $rdf.Formula,
      'http://example.org/',
      format
    );
    return {content: serialized, success: true, errorMessage: ''};
  };

  const onChange = (cb: RdfChangeCallback) => {
    callbacks.push(cb);
  };

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
    store: readonly(store),
    parseErrors: readonly(_parseErrors),
    deleteStatement,
    addStatement,
    onChange,
    exportAs,
  } as RdfStore & {onChange: (cb: RdfChangeCallback) => void};
})();
