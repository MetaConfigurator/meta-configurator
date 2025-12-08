import {readonly, ref, computed, watch, type Ref} from 'vue';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import * as $rdf from 'rdflib';

type RdfChangeCallback = (deletedStatements: $rdf.Statement) => void;

interface RdfStore {
  readonly statements: Readonly<Ref<readonly $rdf.Statement[]>>;
  readonly namespaces: Readonly<Ref<Record<string, string>>>;
  deleteStatement: (stmts: $rdf.Statement) => {success: boolean; errorMessage: string};
  addStatement: (stmts: $rdf.Statement) => {success: boolean; errorMessage: string};
}

export const rdfStoreManager: RdfStore & {
  onChange: (cb: RdfChangeCallback) => void;
} = (() => {
  const callbacks: RdfChangeCallback[] = [];
  const _currentJsonLd = ref('');
  const store = ref<$rdf.IndexedFormula | null>(null);
  const _statements = ref<$rdf.Statement[]>([]);

  const _namespaces = computed<Record<string, string>>(() => {
    if (!store.value) return {};
    return {...store.value.namespaces};
  });

  const setJsonLdText = (jsonLdObj: any) => {
    const text = JSON.stringify(jsonLdObj, null, 2);
    _currentJsonLd.value = text;
    return text;
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

    await new Promise<void>((resolve, reject) => {
      $rdf.parse(jsonLdText, store.value as $rdf.Formula, baseUri, 'application/ld+json', err =>
        err ? reject(err) : resolve()
      );
    });
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
      callbacks.forEach(cb => cb(statement));
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
    deleteStatement,
    addStatement,
    onChange,
  } as RdfStore & {onChange: (cb: RdfChangeCallback) => void};
})();
