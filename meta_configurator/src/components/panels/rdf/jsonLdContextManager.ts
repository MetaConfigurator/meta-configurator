import {ref} from 'vue';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {getContextFromRdfCache, putContextInRdfCache} from './rdfIndexedDbManager';
import {HttpProtocol, RdfMediaType, RdfProxyPath} from './rdfEnums';

interface JsonLdContextManagerStore {
  syncFromData: (data: any) => Promise<any | null>;
  getContextText: () => string;
  resolveContext: (ctx: any) => Promise<any | null>;
  extractContext: (json: any) => Record<string, any>;
  getEquivalentTerms: (term: string, context: Record<string, any>) => Set<string>;
}

enum JsonLdField {
  Context = '@context',
  Url = 'url',
}

export const jsonLdContextManager: JsonLdContextManagerStore = (() => {
  const ACCEPT_JSONLD_HEADER = `${RdfMediaType.JsonLd}, ${RdfMediaType.SchemaOrgJsonLd}, ${RdfMediaType.Json}, ${RdfMediaType.TextPlain}`;
  const MAX_CONTEXT_RESOLUTION_DEPTH = 6;

  type ResolvedContextPayload = {
    context: any;
    rawContent: string;
    sourceUrl: string;
  };

  const data = getDataForMode(SessionMode.DataEditor);
  const contextText = ref('');
  const currentContext = ref<any | null>(null);

  const syncFromData = async (input: any) => {
    const source = input ?? data.data.value;
    const rawContext = source?.[JsonLdField.Context];
    const resolved = await resolveContext(rawContext);
    const ctx = resolved ?? rawContext ?? null;
    currentContext.value = ctx;
    contextText.value = ctx ? JSON.stringify(ctx, null, 2) : '';

    return ctx;
  };

  const getContextText = () => contextText.value;

  const resolveContext = async (ctx: any): Promise<any | null> => {
    return await resolveContextValue(ctx, new Set<string>(), 0);
  };

  const extractContext = (json: any): Record<string, any> => {
    if (!json || typeof json !== 'object') return {};
    const ctx = json[JsonLdField.Context];
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

  /**
   * Fetches and resolves a context reference (URL), with cache-first behavior.
   */
  const fetchContextObject = async (
    url: string,
    visited: Set<string>,
    depth: number
  ): Promise<any> => {
    const normalizedUrl = normalizeContextUrl(url);
    if (!normalizedUrl) {
      return null;
    }

    try {
      const cached = await getContextFromIndexedDb(normalizedUrl, visited, depth);
      if (cached) {
        return cached;
      }

      const payload = await fetchContextPayload(normalizedUrl, visited, depth + 1);
      if (!payload) {
        return null;
      }

      await putContextInRdfCache({
        url: normalizedUrl,
        rawContent: payload.rawContent,
        fetchedAt: new Date().toISOString(),
      });
      return payload.context;
    } catch (_err) {
      return null;
    }
  };

  /**
   * Downloads a context resource and follows context indirections (DOI metadata,
   * `@context` URL pointers, and HTTP Link alternates).
   */
  const fetchContextPayload = async (
    url: string,
    visited: Set<string>,
    depth: number
  ): Promise<ResolvedContextPayload | null> => {
    if (depth > MAX_CONTEXT_RESOLUTION_DEPTH) {
      return null;
    }

    const normalizedUrl = normalizeContextUrl(url);
    if (!normalizedUrl || visited.has(normalizedUrl)) {
      return null;
    }
    visited.add(normalizedUrl);

    const {response} = await fetchContextWithCorsFallback(normalizedUrl);
    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    const parsed = parseContextText(text);
    if (parsed && typeof parsed === 'object') {
      return await resolveParsedContextPayload(
        parsed as Record<string, any>,
        text,
        response.url || normalizedUrl,
        visited,
        depth + 1
      );
    }

    const alternateUrl = getAlternateJsonLdUrl(
      response.headers.get('link'),
      response.url || normalizedUrl
    );
    if (alternateUrl) {
      return await fetchContextPayload(alternateUrl, visited, depth + 1);
    }
    return null;
  };

  /**
   * Resolves a context value that can be string / array / object.
   */
  const resolveContextValue = async (
    ctx: any,
    visited: Set<string>,
    depth: number
  ): Promise<any | null> => {
    if (depth > MAX_CONTEXT_RESOLUTION_DEPTH) return null;
    if (!ctx) return null;

    if (typeof ctx === 'string') {
      return await fetchContextObject(ctx, visited, depth + 1);
    }

    if (Array.isArray(ctx)) {
      const resolved = [];
      for (const part of ctx) {
        if (typeof part === 'string') {
          const fetched = await fetchContextObject(part, visited, depth + 1);
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

  /**
   * Resolves parsed JSON documents to the effective context payload.
   */
  const resolveParsedContextPayload = async (
    parsed: Record<string, any>,
    rawContent: string,
    sourceUrl: string,
    visited: Set<string>,
    depth: number
  ): Promise<ResolvedContextPayload | null> => {
    const followUpUrl = normalizeContextUrl(String(parsed?.[JsonLdField.Url] ?? ''));
    const embeddedContextUrl =
      typeof parsed?.[JsonLdField.Context] === 'string'
        ? normalizeContextUrl(parsed[JsonLdField.Context])
        : '';

    // DOI and similar registries often return a metadata record whose `url` points to
    // the actual JSON-LD context document we want.
    if (
      followUpUrl &&
      followUpUrl !== normalizeContextUrl(sourceUrl) &&
      followUpUrl !== embeddedContextUrl
    ) {
      const followedContext = await fetchContextPayload(followUpUrl, visited, depth + 1);
      if (followedContext) {
        return followedContext;
      }
    }

    const embeddedContext = await resolveContextValue(
      parsed[JsonLdField.Context],
      visited,
      depth + 1
    );
    if (embeddedContext) {
      return {context: embeddedContext, rawContent, sourceUrl};
    }

    if (followUpUrl && followUpUrl !== normalizeContextUrl(sourceUrl)) {
      const followedContext = await fetchContextPayload(followUpUrl, visited, depth + 1);
      if (followedContext) {
        return followedContext;
      }
    }

    return {context: parsed, rawContent, sourceUrl};
  };

  const normalizeContextUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (![HttpProtocol.Http, HttpProtocol.Https].includes(parsed.protocol as HttpProtocol))
        return '';
      return parsed.toString();
    } catch {
      return '';
    }
  };

  const fetchContextWithCorsFallback = async (
    targetUrl: string
  ): Promise<{response: Response; usedProxy: boolean}> => {
    try {
      const directResponse = await fetch(targetUrl, {
        headers: {Accept: ACCEPT_JSONLD_HEADER},
      });
      return {response: directResponse, usedProxy: false};
    } catch {
      const proxyUrl = `${RdfProxyPath.Endpoint}?url=${encodeURIComponent(targetUrl)}`;
      const proxiedResponse = await fetch(proxyUrl, {
        headers: {Accept: ACCEPT_JSONLD_HEADER},
      });
      return {response: proxiedResponse, usedProxy: true};
    }
  };

  const parseContextText = (text: string): any | null => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const getContextFromIndexedDb = async (
    url: string,
    visited: Set<string>,
    depth: number
  ): Promise<any | null> => {
    const result = await getContextFromRdfCache(url);
    if (!result?.rawContent) return null;
    const parsed = parseContextText(result.rawContent);
    if (!parsed || typeof parsed !== 'object') return null;
    const payload = await resolveParsedContextPayload(
      parsed as Record<string, any>,
      result.rawContent,
      url,
      visited,
      depth + 1
    );
    return payload?.context ?? null;
  };

  const getAlternateJsonLdUrl = (linkHeader: string | null, baseUrl: string): string | null => {
    if (!linkHeader) return null;
    const parts = linkHeader.split(',');
    for (const part of parts) {
      const segment = part.trim();
      const hasAlternateRel = /;\s*rel="?alternate"?/i.test(segment);
      const hasJsonLdType = /;\s*type="?application\/ld\+json"?/i.test(segment);
      if (!hasAlternateRel || !hasJsonLdType) continue;
      const match = segment.match(/<([^>]+)>/);
      if (!match?.[1]) continue;
      try {
        return new URL(match[1], baseUrl).toString();
      } catch {
        continue;
      }
    }
    return null;
  };

  return {
    syncFromData,
    getContextText,
    resolveContext,
    extractContext,
    getEquivalentTerms,
  };
})();
