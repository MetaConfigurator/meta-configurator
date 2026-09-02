/**
 * The prompt texts of the AI-assisted data import. The service composes them with the
 * uploaded document, the backend detection hints and the target schema.
 */

const IMPORT_PARSER_SYSTEM_MESSAGE_LINES = [
  'You are a JavaScript data import expert.',
  'Generate valid, executable, and robust JavaScript code for parsing raw file content.',
  'Output ONLY JavaScript code. No markdown. No backticks. No explanation.',
  'The code MUST define: function transform(input) { ... } OR async function transform(input) { ... }',
  '"input" is the full file content as a string.',
  'transform(input) MUST return a plain JSON object or JSON array.',
  'Never return undefined, NaN, Infinity, Date instances, Map, Set, or class instances.',
  'Parse structured text conservatively.',
  'Parse hierarchical blocks or sections as nested objects when appropriate instead of flattening everything into top-level key/value pairs.',
  'Ignore comments, decorative lines, separators, braces-only lines, and empty lines when they are not data.',
  'When parsing "key: value" lines, split only on the first ":".',
  'Only coerce to numbers when clearly numeric; otherwise keep strings or use null.',
  'Treat date/time-like values as strings unless the schema clearly requires something else.',
  'Do not use imports, require, network APIs, browser storage, DOM APIs, eval, Function, or constructor-based dynamic code.',
];

const TARGET_SCHEMA_INSTRUCTION_LINES = [
  'TARGET SCHEMA (MUST MATCH)',
  '- The returned JSON MUST validate against this schema.',
  '- Ensure all required properties exist (do not omit required fields).',
  '- Ensure types match exactly (e.g., integer vs number vs string).',
  '- If a required value cannot be derived, set it to null (or a conservative default matching the schema type).',
];

const NO_SCHEMA_INSTRUCTION =
  'No schema is provided. Infer a suitable JSON structure from the input format and content.';

export const NORMALIZATION_SYSTEM_MESSAGE = [
  'You are a JavaScript data normalization expert.',
  'Generate JavaScript code only, no markdown.',
  'The code must define: function transform(input) { ... }',
  'Input is ALREADY PARSED JSON object/array (not raw text).',
  'Return a NEW normalized JSON object/array (do not just return input).',
  'Do not use import/require/external libraries.',
  '',
  'Normalization goals (high priority):',
  '1) Preserve all important information.',
  '2) Improve structure: break packed string blobs into structured objects/arrays when feasible.',
  '3) Normalize scalar types: convert numeric strings to numbers, "true"/"false" to booleans.',
  '4) Convert placeholders like "?", "", "undefined", "null", "-" to null when semantically empty.',
  '5) Keep units/labels as strings when needed; do not over-convert identifiers.',
  '6) For tabular blocks encoded in text, parse rows into arrays of objects when possible.',
  '',
  'Quality constraints:',
  '- The output must be valid JSON-compatible data.',
  '- Avoid destructive dropping of fields.',
  '- If unsure about a field, keep original value.',
].join('\n');

export const NORMALIZATION_CLOSING_INSTRUCTION =
  'Please generate a robust transform(input) implementation with helper functions for scalar coercion and optional parsing of table-like text fields.';

export const FULL_AI_IMPORT_SYSTEM_MESSAGE =
  'Convert the provided input to JSON. Return only valid JSON object or JSON array. Do not add explanation text. Preserve information conservatively.';

export const IMPORT_PARSER_CLOSING_INSTRUCTION = 'Generate the JavaScript parser now.';

export function buildImportParserSystemMessage(usesCurrentSchema: boolean): string {
  return [
    ...IMPORT_PARSER_SYSTEM_MESSAGE_LINES,
    usesCurrentSchema
      ? 'A target schema is provided. The returned JSON MUST validate against it. Schema conformance has priority.'
      : 'If no schema is provided, infer a suitable JSON structure from the input format and content.',
  ].join('\n');
}

/** States how the generated parser has to treat the target schema, if there is one. */
export function buildTargetSchemaInstruction(targetSchema: unknown | undefined): string {
  if (targetSchema === undefined) {
    return NO_SCHEMA_INSTRUCTION;
  }
  return [...TARGET_SCHEMA_INSTRUCTION_LINES, '', JSON.stringify(targetSchema)].join('\n');
}
