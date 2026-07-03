export const JS_REFERENCE_GUIDE = `JavaScript Transformation Guide

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

export const JS_INPUT_EXAMPLE = `{"person":{"firstName":"Alice","lastName":"Smith","age":34}}`;
export const JS_INPUT_EXAMPLE_SCHEMA = `{"type":"object","properties":{"person":{"type":"object"}}}`;
export const JS_OUTPUT_EXAMPLE = `{"fullName":"Alice Smith","isAdult":true}`;
export const JS_OUTPUT_EXAMPLE_SCHEMA = `{"type":"object","properties":{"fullName":{"type":"string"}}}`;

export const JS_EXAMPLE_CODE = `function transform(input) {
  const p = input.person ?? {};
  return {
    fullName: String(p.firstName ?? "") + " " + String(p.lastName ?? ""),
    isAdult: Number(p.age ?? 0) >= 18
  };
}`;
