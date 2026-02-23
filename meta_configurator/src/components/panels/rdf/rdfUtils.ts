export enum RdfTermType {
  NamedNode = 'NamedNode',
  BlankNode = 'BlankNode',
  Literal = 'Literal',
  Variable = 'Variable',
  DefaultGraph = 'DefaultGraph',
  Quad = 'Quad',
}

export type RdfTermTypeString = `${RdfTermType}`;

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
      "type": "string",
      "format": "uri"
    },
    {
      "type": "object",
      "additionalProperties": true
    },
    {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "string",
            "format": "uri"
          },
          {
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
