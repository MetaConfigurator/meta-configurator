import {readonly, ref, computed, watch, type Ref} from 'vue';
import {getDataForMode, useCurrentData} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import * as $rdf from 'rdflib';
import type {Quad} from 'rdflib/lib/tf-types';
import {literal, sym} from 'rdflib';
import type {Path} from '@/utility/path';

type RdfChangeCallback = (oldStore: string, newStore: string) => void;

interface RdfStore {
  readonly store: Readonly<Ref<$rdf.IndexedFormula>>;
  readonly statements: Readonly<Ref<readonly $rdf.Statement[]>>;
  readonly namespaces: Readonly<Ref<Record<string, string>>>;
  readonly parseErrors: Readonly<Ref<string[]>>;
  deleteStatement: (stmts: $rdf.Statement) => {success: boolean; errorMessage: string};
  addStatement: (stmts: $rdf.Statement) => {success: boolean; errorMessage: string};
  exportAs: (format: string) => {content: string; success: boolean; errorMessage: string};
  findMatchingStatementIndex: (path: Path) => number;
}

export const rdfStoreManager: RdfStore & {
  onChange: (cb: RdfChangeCallback) => void;
} = (() => {
  const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

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

  const findMatchingStatementIndex = (path: Path): number => {
    if (!store.value) return -1;
    const jsonld = useCurrentData().data.value;

    if (path[0] !== '@graph') return -1;
    const graphIndex = path[1] as number;
    const predKey = path[2] as string;
    const objSelector = path[3];

    const node = jsonld['@graph'][graphIndex];
    if (!node || !node['@id']) return -1;

    const subjectIRI = expandTerm(node['@id'], jsonld['@context']);
    const predicateIRI = expandTerm(predKey, jsonld['@context']);
    if (!predicateIRI) return -1;

    const subject = sym(subjectIRI!);
    const predicate = sym(predicateIRI);

    let matches: any[] = [];

    if (typeof objSelector === 'number') {
      let values = node[predKey];
      if (values === undefined) return -1;
      if (!Array.isArray(values)) values = [values];
      const v = values[objSelector];
      if (v === undefined) return -1;

      let object;
      if (typeof v === 'object' && '@value' in v) {
        object = literal(v['@value'], v['@type']);
      } else {
        object = literal(v);
      }
      matches = store.value.match(subject, predicate, object, null);
    } else {
      matches = store.value.match(subject, predicate, null, null);
    }

    if (matches.length === 0) return -1;
    const idx = findStatementIndexFromQuad(matches[0]);
    return idx !== -1 ? idx : -1;
  };

  function expandTerm(term: string, context: any): string | null {
    if (term === undefined) return null;
    if (term === '@type') return RDF_TYPE;
    if (term === '@value') return null;
    if (term === '@id') return null;
    if (term.startsWith('@')) return null;

    if (term.startsWith('http://') || term.startsWith('https://')) {
      return term;
    }

    if (term.includes(':')) {
      const [prefix, local] = term.split(':', 2);
      if (prefix === undefined) return null;
      const prefixDef = context?.[prefix];
      if (typeof prefixDef === 'string') {
        return prefixDef + local;
      }
    }
    const def = context?.[term];

    if (typeof def === 'string') {
      return def;
    }

    if (typeof def === 'object' && '@id' in def) {
      return def['@id'];
    }

    if (typeof context?.['@vocab'] === 'string') {
      return context['@vocab'] + term;
    }

    return null;
  }

  function findStatementIndexFromQuad(quad: Quad): number {
    const statements = rdfStoreManager.statements.value;
    const index = statements.findIndex(
      st =>
        st.subject.value === quad.subject.value &&
        st.predicate.value === quad.predicate.value &&
        st.object.value === quad.object.value
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
    store: readonly(store),
    parseErrors: readonly(_parseErrors),
    deleteStatement,
    addStatement,
    onChange,
    exportAs,
    findMatchingStatementIndex,
  } as RdfStore & {onChange: (cb: RdfChangeCallback) => void};
})();
