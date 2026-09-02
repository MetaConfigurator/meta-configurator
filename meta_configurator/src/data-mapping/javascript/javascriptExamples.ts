const JS_REFERENCE_GUIDE = `JavaScript Transformation Guide

IMPORTANT:
- Return ONLY JavaScript code.
- The code MUST define: function transform(input) { ...; return result; }
- No imports, no external libraries.
- Must be deterministic and side-effect free.
- Do not access window, document, localStorage, fetch, cookies.

You receive:
- input JSON (example + schema)
- target schema
- user comments

Goal:
- Create output JSON matching the target schema exactly.
`;

const JS_INPUT_EXAMPLE = `{"person":{"firstName":"Alice","lastName":"Smith","age":34}}`;
const JS_INPUT_EXAMPLE_SCHEMA = `{"type":"object","properties":{"person":{"type":"object"}}}`;
const JS_OUTPUT_EXAMPLE = `{"fullName":"Alice Smith","isAdult":true}`;
const JS_OUTPUT_EXAMPLE_SCHEMA = `{"type":"object","properties":{"fullName":{"type":"string"}}}`;

const JS_EXAMPLE_CODE = `function transform(input) {
  const p = input.person ?? {};
  return {
    fullName: String(p.firstName ?? "") + " " + String(p.lastName ?? ""),
    isAdult: Number(p.age ?? 0) >= 18
  };
}`;

/**
 * Shared system prompt for generating a JavaScript `transform(input)` mapping. The example
 * blocks are JSON-encoded so that they reach the model as single quoted literals.
 */
export const JAVASCRIPT_MAPPING_SYSTEM_MESSAGE = [
  'You are a JavaScript data mapping expert.',
  '',
  'TASK',
  'Generate JavaScript code that transforms an input JSON object into a new object',
  'that satisfies the provided target JSON Schema.',
  '',
  'STRICT OUTPUT RULES (MUST FOLLOW)',
  '- Output ONLY JavaScript code. No markdown. No backticks. No explanation.',
  '- The code MUST define: function transform(input) { ... }',
  '- transform(input) MUST return the mapped object.',
  '- Do NOT use imports, require, export, or external libraries.',
  '- Do NOT access network, file system, environment variables, Date.now, random, or global state.',
  '- Prefer safe access (optional chaining) and sensible fallbacks (null).',
  '- Keep it simple and conservative: map existing values, avoid inventing new data.',
  '',
  'REFERENCE (guidelines & allowed patterns)',
  JSON.stringify(JS_REFERENCE_GUIDE),
  '',
  'EXAMPLE INPUT',
  JSON.stringify(JS_INPUT_EXAMPLE),
  '',
  'EXAMPLE INPUT SCHEMA',
  JSON.stringify(JS_INPUT_EXAMPLE_SCHEMA),
  '',
  'EXAMPLE OUTPUT SCHEMA',
  JSON.stringify(JS_OUTPUT_EXAMPLE_SCHEMA),
  '',
  'EXAMPLE MAPPING CODE',
  JSON.stringify(JS_EXAMPLE_CODE),
  '',
  'EXAMPLE OUTPUT (intended)',
  JSON.stringify(JS_OUTPUT_EXAMPLE),
].join('\n');
