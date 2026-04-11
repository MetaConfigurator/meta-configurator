import {Parser} from 'sparqljs';
import type * as $rdf from 'rdflib';
import {HighlightStyle} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {useDark} from '@vueuse/core';
import {computed} from 'vue';
import type {Path} from '@/utility/path';
import {RdfMediaType} from './rdfEnums';

export const isDark = () => computed(() => useDark().value);

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

export const syntaxHighlightStyle = HighlightStyle.define([
  {tag: tags.keyword, color: 'var(--p-purple-400)', fontWeight: 'bold'},
  {tag: tags.variableName, color: 'var(--p-primary-400)'},
  {tag: tags.string, color: 'var(--p-green-400)'},
  {tag: tags.number, color: 'var(--p-orange-400)'},
  {tag: tags.comment, color: 'var(--p-text-muted-color)', fontStyle: 'italic'},
  {tag: tags.operator, color: 'var(--p-cyan-400)'},
  {tag: tags.punctuation, color: 'var(--p-text-color)'},
  {tag: tags.typeName, color: 'var(--p-red-400)'},
  {tag: tags.propertyName, color: 'var(--p-yellow-400)'},
]);

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
