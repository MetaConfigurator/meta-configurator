import * as $rdf from 'rdflib';
import {RdfMediaType, RdfPredicateIri, RdfPropertyTypeIri} from '@/components/panels/rdf/rdfEnums';

const CONTENT_TYPE_MAP: Record<string, string> = {
  [RdfMediaType.RdfXml]: RdfMediaType.RdfXml,
  [RdfMediaType.Xml]: RdfMediaType.RdfXml,
  [RdfMediaType.TextXml]: RdfMediaType.RdfXml,
  [RdfMediaType.Turtle]: RdfMediaType.Turtle,
  [RdfMediaType.XTurtle]: RdfMediaType.Turtle,
  [RdfMediaType.NTriples]: RdfMediaType.NTriples,
  [RdfMediaType.N3]: RdfMediaType.N3,
  [RdfMediaType.JsonLd]: RdfMediaType.JsonLd,
  [RdfMediaType.Json]: RdfMediaType.JsonLd,
};

const EXTENSION_MAP: Record<string, string> = {
  '.ttl': RdfMediaType.Turtle,
  '.nt': RdfMediaType.NTriples,
  '.n3': RdfMediaType.N3,
  '.rdf': RdfMediaType.RdfXml,
  '.owl': RdfMediaType.RdfXml,
  '.xml': RdfMediaType.RdfXml,
  '.jsonld': RdfMediaType.JsonLd,
  '.json': RdfMediaType.JsonLd,
};

function formatFromExtension(url: string): string | null {
  const lower = url.toLowerCase();
  return Object.entries(EXTENSION_MAP).find(([ext]) => lower.endsWith(ext))?.[1] ?? null;
}

export function detectRdfFormat(contentTypeHeader: string, url: string): string | null {
  const contentType = contentTypeHeader.split(';')[0]!.trim().toLowerCase();

  const fromContentType = CONTENT_TYPE_MAP[contentType];
  if (fromContentType) return fromContentType;

  const isGenericContentType =
    contentType === RdfMediaType.TextPlain || contentType === RdfMediaType.OctetStream;

  if (isGenericContentType || !fromContentType) {
    return formatFromExtension(url);
  }

  return null;
}

export function parseRdfToStore(
  content: string,
  baseUri: string,
  format: string
): Promise<$rdf.Formula> {
  return new Promise((resolve, reject) => {
    const store = $rdf.graph();
    $rdf.parse(content, store as $rdf.Formula, baseUri, format, err => {
      if (err) {
        reject(new Error(`The ontology content at "${baseUri}" is not valid RDF.`));
      } else {
        resolve(store as $rdf.Formula);
      }
    });
  });
}

export function serializeStoreToNTriples(store: $rdf.Formula): string {
  return [...new Set(store.statements.map(s => s.toNT()))].join('\n');
}

function normalizeKeyName(key: unknown): string {
  if (key && typeof key === 'object' && 'value' in key) return String((key as any).value);
  if (key && typeof key === 'object' && 'name' in key) return String((key as any).name);
  return String(key).replace(/^\?/, '');
}

export function getBindingValue(binding: any, name: string): string {
  if (!binding) return '';

  // Comunica bindings expose keys() + get(key)
  if (typeof binding.keys === 'function' && typeof binding.get === 'function') {
    for (const key of binding.keys()) {
      if (normalizeKeyName(key) === name) {
        return binding.get(key)?.value ?? '';
      }
    }
    return '';
  }

  // Map-like fallback
  if (typeof binding.entries === 'function') {
    for (const [key, val] of binding.entries()) {
      if (normalizeKeyName(key) === name) return val?.value ?? '';
    }
  }

  return '';
}

export function escapeForSparqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildOntologyQuery(namespace: string): string {
  const namespaceFilter = namespace
    ? `FILTER(STRSTARTS(STR(?about), "${escapeForSparqlString(namespace)}"))`
    : '';

  return `
    SELECT ?about ?propertyType (SAMPLE(?commentTerm) AS ?comment) WHERE {
      ?about a ?propertyType .
      FILTER(
        ?propertyType IN (
          <${RdfPropertyTypeIri.OwlObjectProperty}>,
          <${RdfPropertyTypeIri.OwlDatatypeProperty}>,
          <${RdfPropertyTypeIri.RdfProperty}>,
          <${RdfPropertyTypeIri.RdfsClass}>,
          <${RdfPropertyTypeIri.OwlClass}>
        )
      )
      ${namespaceFilter}
      OPTIONAL {
        ?about <${RdfPredicateIri.RdfsComment}> ?commentTerm .
        FILTER(LANG(?commentTerm) = "" || LANGMATCHES(LANG(?commentTerm), "en"))
      }
    }
    GROUP BY ?about ?propertyType
    ORDER BY STR(?about)
  `;
}

export function normalizeIri(value: string | undefined): string {
  return (value ?? '').trim();
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function collectPrefixes(contextPart: unknown, out: Record<string, string>): void {
  if (!contextPart || typeof contextPart !== 'object' || Array.isArray(contextPart)) return;

  for (const [key, value] of Object.entries(contextPart as Record<string, unknown>)) {
    if (typeof value === 'string') {
      out[key] = value;
    } else if (typeof value === 'object' && value !== null && '@id' in value) {
      const id = (value as Record<string, unknown>)['@id'];
      if (typeof id === 'string') out[key] = id;
    }
  }
}

export function extractPrefixNamespaces(context: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = Array.isArray(context) ? context : [context];
  parts.forEach(part => collectPrefixes(part, out));
  return out;
}
