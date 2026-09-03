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
