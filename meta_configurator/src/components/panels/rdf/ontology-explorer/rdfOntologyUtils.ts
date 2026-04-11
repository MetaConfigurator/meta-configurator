import * as $rdf from 'rdflib';
import {RdfMediaType} from '@/components/panels/rdf/rdfEnums';

export function detectRdfFormat(contentTypeHeader: string, url: string): string | null {
  const contentType = contentTypeHeader.split(';')[0]!.trim().toLowerCase();
  const normalizedUrl = url.toLowerCase();

  if (contentType === RdfMediaType.RdfXml) return RdfMediaType.RdfXml;
  if (contentType === RdfMediaType.Xml || contentType === RdfMediaType.TextXml)
    return RdfMediaType.RdfXml;
  if (contentType === RdfMediaType.Turtle || contentType === RdfMediaType.XTurtle)
    return RdfMediaType.Turtle;
  if (contentType === RdfMediaType.NTriples) return RdfMediaType.NTriples;
  if (contentType === RdfMediaType.N3) return RdfMediaType.N3;
  if (contentType === RdfMediaType.JsonLd) return RdfMediaType.JsonLd;
  if (contentType === RdfMediaType.Json) return RdfMediaType.JsonLd;

  if (contentType === RdfMediaType.TextPlain || contentType === RdfMediaType.OctetStream) {
    if (normalizedUrl.endsWith('.nt')) return RdfMediaType.NTriples;
    if (normalizedUrl.endsWith('.ttl')) return RdfMediaType.Turtle;
    if (normalizedUrl.endsWith('.n3')) return RdfMediaType.N3;
    if (
      normalizedUrl.endsWith('.rdf') ||
      normalizedUrl.endsWith('.owl') ||
      normalizedUrl.endsWith('.xml')
    ) {
      return RdfMediaType.RdfXml;
    }
    if (normalizedUrl.endsWith('.jsonld') || normalizedUrl.endsWith('.json')) {
      return RdfMediaType.JsonLd;
    }
  }

  if (
    normalizedUrl.endsWith('.rdf') ||
    normalizedUrl.endsWith('.owl') ||
    normalizedUrl.endsWith('.xml')
  ) {
    return RdfMediaType.RdfXml;
  }
  if (normalizedUrl.endsWith('.ttl')) return RdfMediaType.Turtle;
  if (normalizedUrl.endsWith('.nt')) return RdfMediaType.NTriples;
  if (normalizedUrl.endsWith('.n3')) return RdfMediaType.N3;
  if (normalizedUrl.endsWith('.jsonld') || normalizedUrl.endsWith('.json')) {
    return RdfMediaType.JsonLd;
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
        return;
      }
      resolve(store as $rdf.Formula);
    });
  });
}

export function serializeStoreToNTriples(store: $rdf.Formula): string {
  const triples = new Set<string>();
  for (const statement of store.statements) {
    triples.add(statement.toNT());
  }
  return Array.from(triples).join('\n');
}

export function getBindingValue(binding: any, name: string): string {
  for (const key of binding.keys()) {
    const keyName = key?.value ?? key?.name ?? String(key).replace(/^\?/, '');
    if (keyName === name) {
      return binding.get(key)?.value ?? '';
    }
  }
  return '';
}

export function escapeForSparqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function isLikelyIri(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('_:')) return false;
  if (/\s/.test(value)) return false;
  return /^[A-Za-z][A-Za-z0-9+.-]*:.+/.test(value);
}

export function normalizeIri(value: string | undefined): string {
  return (value ?? '').trim();
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function extractPrefixNamespaces(context: any): Record<string, string> {
  const out: Record<string, string> = {};

  if (Array.isArray(context)) {
    for (const part of context) {
      collectFromContextObject(part, out);
    }
  } else {
    collectFromContextObject(context, out);
  }

  return out;
}

function collectFromContextObject(contextPart: any, out: Record<string, string>) {
  if (!contextPart || typeof contextPart !== 'object' || Array.isArray(contextPart)) {
    return;
  }

  for (const [key, value] of Object.entries(contextPart)) {
    if (typeof value === 'string') {
      out[key] = value;
      continue;
    }

    if (value && typeof value === 'object' && '@id' in value && typeof value['@id'] === 'string') {
      out[key] = value['@id'];
    }
  }
}
