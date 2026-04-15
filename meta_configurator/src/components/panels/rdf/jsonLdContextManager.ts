import {ref, watch} from 'vue';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {XSD_NS} from '@/components/panels/rdf/rdfUtils';

interface JsonLdContextManagerStore {
  getContextText: () => string;
  extractContext: (json: any) => Record<string, any>;
  getEquivalentTerms: (term: string) => Set<string>;
  isIRI: (value: string) => boolean;
  toPrefixed: (iri: string) => string;
  expandIRI: (value: string) => string | null;
  isLinkableIRI: (value: string) => boolean;
  iriHref: (value: string) => string | null;
}

export const jsonLdContextManager: JsonLdContextManagerStore = (() => {
  const parsedContext = ref<Record<string, any>>({});
  const contextText = ref('');

  const getContextText = () => contextText.value;

  const extractContext = (json: any): Record<string, any> => {
    if (!json || typeof json !== 'object') return {};
    const ctx = json['@context'];
    if (!ctx) return {};

    if (typeof ctx === 'object' && !Array.isArray(ctx)) {
      return ctx;
    }

    if (Array.isArray(ctx)) {
      return ctx.reduce<Record<string, any>>((merged, entry) => {
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          Object.assign(merged, entry);
        }
        return merged;
      }, {});
    }

    return {};
  };

  const resolvePrefix = (prefix: string, local: string): string | null => {
    const ctx = parsedContext.value;

    const entry = ctx[prefix];
    if (entry) {
      const ns = typeof entry === 'string' ? entry : entry?.['@id'];
      if (typeof ns === 'string') return ns + local;
    }

    const ns = rdfStoreManager.namespaces.value[prefix];
    if (ns) return ns + local;

    return null;
  };

  const getEquivalentTerms = (term: string): Set<string> => {
    const out = new Set<string>();
    out.add(term);

    if (isIRI(term)) {
      const prefixed = toPrefixed(term);
      if (prefixed !== term) out.add(prefixed);

      const ctx = parsedContext.value;
      for (const key of Object.keys(ctx)) {
        const entry = ctx[key];
        const mapped = typeof entry === 'string' ? entry : entry?.['@id'];
        if (mapped === term) out.add(key);
      }
    } else {
      const expanded = expandIRI(term);
      if (expanded) out.add(expanded);
    }

    return out;
  };

  const isIRI = (value: string): boolean => {
    return (
      Boolean(value) &&
      !value.startsWith('_:') &&
      !/\s/.test(value) &&
      /^[A-Za-z][A-Za-z0-9+.-]*:.+/.test(value)
    );
  };

  const toPrefixed = (iri: string): string => {
    const ctx = parsedContext.value;

    for (const [key, entry] of Object.entries(ctx)) {
      const ns = typeof entry === 'string' ? entry : (entry as any)?.['@id'];
      if (typeof ns === 'string' && iri.startsWith(ns)) {
        return `${key}:${iri.slice(ns.length)}`;
      }
    }

    for (const [prefix, namespace] of Object.entries(rdfStoreManager.namespaces.value)) {
      if (iri.startsWith(namespace)) {
        return `${prefix}:${iri.slice(namespace.length)}`;
      }
    }

    if (iri.startsWith(XSD_NS)) {
      return `xsd:${iri.slice(XSD_NS.length)}`;
    }

    return iri;
  };

  const expandIRI = (value: string): string | null => {
    if (!value || typeof value !== 'string') return null;

    if (isIRI(value)) return value;

    const idx = value.indexOf(':');

    if (idx !== -1) {
      const prefix = value.slice(0, idx);
      const local = value.slice(idx + 1);
      const resolved = resolvePrefix(prefix, local);
      if (resolved) return resolved;
    }

    const ctx = parsedContext.value;
    const entry = ctx[value];
    if (entry) {
      const mapped = typeof entry === 'string' ? entry : entry?.['@id'];
      if (typeof mapped === 'string') return mapped;
    }

    return null;
  };

  const isLinkableIRI = (value: string): boolean => {
    return expandIRI(value) !== null;
  };

  const iriHref = (value: string): string | null => {
    return expandIRI(value);
  };

  watch(
    () => getDataForMode(SessionMode.DataEditor).data.value,
    data => {
      const ctx = extractContext(data);
      parsedContext.value = ctx;
      contextText.value = JSON.stringify(ctx, null, 2);
    }
  );

  return {
    getContextText,
    extractContext,
    getEquivalentTerms,
    isIRI,
    toPrefixed,
    expandIRI,
    isLinkableIRI,
    iriHref,
  };
})();
