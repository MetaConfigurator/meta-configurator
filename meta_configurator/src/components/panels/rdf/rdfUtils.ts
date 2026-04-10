import {Parser} from 'sparqljs';
import type * as $rdf from 'rdflib';

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
};

export type SparqlValidationResult = {
  valid: boolean;
  errorMessage: string | null;
  errorLine: number | null;
};

/**
 * Shared SPARQL syntax validation used by RDF editors.
 */
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
