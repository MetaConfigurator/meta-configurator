import {Parser} from 'sparqljs';
import type * as $rdf from 'rdflib';
import {useDark} from '@vueuse/core';
import {computed} from 'vue';
import type {Path} from '@/utility/path';
import {RdfMediaType} from './rdfEnums';

export const isDark = () => computed(() => useDark().value);

export const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';

export enum RdfTermType {
  NamedNode = 'NamedNode',
  BlankNode = 'BlankNode',
  Literal = 'Literal',
  Variable = 'Variable',
  DefaultGraph = 'DefaultGraph',
  Quad = 'Quad',
  Collection = 'Collection',
  Empty = 'Empty',
}

export type RdfTermTypeString = `${RdfTermType}`;

export type RdfNodeLiteral = {
  predicate: string;
  value: string;
  isIRI: boolean;
  href?: string;
  statement?: $rdf.Statement;
};

export interface SelectedNodeData {
  id: string;
  label: string;
  literals?: RdfNodeLiteral[];
}

export enum RdfChangeType {
  Add = 'add',
  Edit = 'edit',
  Delete = 'delete',
}

export const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const stringValue = String(value).trim();

  if (/^-?\d+$/.test(stringValue)) {
    const numValue = Number(stringValue);

    if (Number.isSafeInteger(numValue)) {
      return numValue.toLocaleString();
    }
  }

  return stringValue;
};

export const defaultJsonLdSchema = `
{
  "oneOf": [
    {
      "title": "URI",
      "type": "string",
      "format": "uri"
    },
    {
      "title": "Object",
      "type": "object",
      "additionalProperties": true
    },
    {
      "title": "Array of URIs or Objects",
      "type": "array",
      "items": {
        "oneOf": [
          {
            "title": "URI",
            "type": "string",
            "format": "uri"
          },
          {
            "title": "Object",
            "type": "object",
            "additionalProperties": true
          }
        ]
      }
    }
  ]
}
`.trim();

export const visualizationQueryExample_1 = `
CONSTRUCT {
  ?subject ?predicate ?object .
}
`.trim();

export const visualizationQueryExample_2 = `
CONSTRUCT {
  ?subject ?predicate ?object .
}
WHERE {
  ?s ?p ?o .

  BIND(?s AS ?subject)
  BIND(?p AS ?predicate)
  BIND(?o AS ?object)
}
`.trim();

export const defaultQueryTemplate = `SELECT ?subject ?predicate ?object
WHERE
{
  ?subject ?predicate ?object .
}
`.trim();

export const visualizationQueryTemplate = `CONSTRUCT {
  ?subject ?predicate ?object .
}
WHERE
{
  ?subject ?predicate ?object .
}
`.trim();

export const predicateAliasMapping: Record<string, readonly string[]> = {
  '@type': ['rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],
  '@value': ['rdf:value', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value'],
  '@language': ['dc:language', 'http://purl.org/dc/elements/1.1/language'],
  '@datatype': ['rdf:datatype', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#datatype'],
  '@graph': ['http://www.w3.org/2004/03/trix/rdfg-1/Graph'],
  '@list': ['rdf:List', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#List'],
  '@set': ['rdf:Bag', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag'],
  '@first': ['rdf:first', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first'],
  '@rest': ['rdf:rest', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'],
  '@nil': ['rdf:nil', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'],
  '@reverse': ['owl:inverseOf', 'http://www.w3.org/2002/07/owl#inverseOf'],
};

export type SparqlValidationResult = {
  valid: boolean;
  errorMessage: string | null;
  errorLine: number | null;
};

export function validateSparqlSyntax(query: string): SparqlValidationResult {
  try {
    const parser = new Parser();
    parser.parse(query);
    return {
      valid: true,
      errorMessage: null,
      errorLine: null,
    };
  } catch (err: any) {
    const message = String(err?.message ?? 'Invalid SPARQL query syntax.');
    const lineMatch = message.match(/line[:\s]+(\d+)/i);

    if (lineMatch?.[1]) {
      return {
        valid: false,
        errorMessage: message,
        errorLine: parseInt(lineMatch[1], 10),
      };
    }

    const locationLine = err?.location?.start?.line;
    return {
      valid: false,
      errorMessage: message,
      errorLine: typeof locationLine === 'number' ? locationLine : null,
    };
  }
}

export function downloadFile(serialized: string, format: string) {
  const blob = new Blob([serialized], {type: format});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Data.${getFileExtension(format)}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function areJsonLdPathsEqual(path1: Path, path2: Path): boolean {
  if (path1.length !== path2.length) {
    return false;
  }

  for (let i = 0; i < path1.length; i++) {
    if (path1[i] !== path2[i]) {
      return false;
    }
  }

  return true;
}

function getFileExtension(format: string): string {
  switch (format) {
    case RdfMediaType.Turtle:
      return 'ttl';
    case RdfMediaType.NTriples:
    case RdfMediaType.TextPlain:
      return 'nt';
    case RdfMediaType.JsonLd:
      return 'jsonld';
    case RdfMediaType.RdfXml:
      return 'rdf';
    case 'text/csv':
      return 'csv';
    default:
      return 'txt';
  }
}
