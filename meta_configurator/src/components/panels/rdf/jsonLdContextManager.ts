import {ref} from 'vue';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';

interface JsonLdContextManagerStore {
  syncFromData: (data: any) => Promise<any | null>;
  getContextText: () => string;
  resolveContext: (ctx: any) => Promise<any | null>;
  mergeContexts: (primary: any, secondary: any) => any;
  extractContext: (json: any) => Record<string, any>;
  getEquivalentTerms: (term: string, context: Record<string, any>) => Set<string>;
}

export const jsonLdContextManager: JsonLdContextManagerStore = (() => {
  const data = getDataForMode(SessionMode.DataEditor);
  const contextText = ref('');
  const currentContext = ref<any | null>(null);
  const contextCache = new Map<string, any>();

  const syncFromData = async (input: any) => {
    const source = input ?? data.data.value;
    const rawContext = source?.['@context'];
    const resolved = await resolveContext(rawContext);
    const ctx = resolved ?? rawContext ?? null;
    currentContext.value = ctx;
    contextText.value = ctx ? JSON.stringify(ctx, null, 2) : '';
    return ctx;
  };

  const getContextText = () => contextText.value;

  const resolveContext = async (ctx: any): Promise<any | null> => {
    if (!ctx) return null;
    if (typeof ctx === 'string') {
      return await fetchContextObject(ctx);
    }
    if (Array.isArray(ctx)) {
      const resolved = [];
      for (const part of ctx) {
        if (typeof part === 'string') {
          const fetched = await fetchContextObject(part);
          resolved.push(fetched ?? part);
          continue;
        }
        resolved.push(part);
      }
      return resolved;
    }
    if (typeof ctx === 'object') {
      return ctx;
    }
    return null;
  };

  const mergeContexts = (primary: any, secondary: any): any => {
    if (!primary) return secondary;
    if (!secondary) return primary;

    if (Array.isArray(primary) || Array.isArray(secondary)) {
      const left = Array.isArray(primary) ? primary : [primary];
      const right = Array.isArray(secondary) ? secondary : [secondary];
      return [...left, ...right];
    }

    if (typeof primary === 'object' && typeof secondary === 'object') {
      return {...secondary, ...primary};
    }

    if (typeof primary === 'string' && typeof secondary === 'string') {
      return primary === secondary ? primary : [primary, secondary];
    }

    return [primary, secondary];
  };

  const extractContext = (json: any): Record<string, any> => {
    if (!json || typeof json !== 'object') return {};
    const ctx = json['@context'];
    if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
      return ctx;
    }
    return {};
  };

  const getEquivalentTerms = (term: string, context: Record<string, any>): Set<string> => {
    const out = new Set<string>();
    out.add(term);
    const compact = compactTerm(term, context);
    if (compact) out.add(compact);
    return out;
  };

  const compactTerm = (fullIri: string, context: Record<string, any>): string | null => {
    if (!fullIri || typeof fullIri !== 'string') return null;
    for (const prefix in context) {
      const base = context[prefix];
      if (typeof base === 'string' && fullIri.startsWith(base)) {
        return `${prefix}:${fullIri.slice(base.length)}`;
      }
    }
    return null;
  };

  const fetchContextObject = async (url: string): Promise<any> => {
    if (contextCache.has(url)) {
      return contextCache.get(url);
    }
    try {
      const response = await fetch(url, {
        headers: {Accept: 'application/ld+json, application/json'},
      });
      if (!response.ok) {
        contextCache.set(url, null);
        return null;
      }
      const data = await response.json();
      const resolved =
        data && typeof data === 'object' && '@context' in data ? data['@context'] : data;
      contextCache.set(url, resolved);
      return resolved;
    } catch (_err) {
      contextCache.set(url, null);
      return null;
    }
  };

  return {
    syncFromData,
    getContextText,
    resolveContext,
    mergeContexts,
    extractContext,
    getEquivalentTerms,
  };
})();
