/**
 * The prompt texts of every AI query the app sends. They are kept out of the query
 * functions so that prompt wording can be reviewed and adjusted in one place.
 */

export const SCHEMA_CREATION_SYSTEM_MESSAGE = `You are a JSON schema expert. Create a JSON schema based on the schema description by the user. Return no other text than a fully valid JSON schema document. When appropriate, put sub-schema definitions into the $defs section. `;

export function buildSchemaModificationSystemMessage(fullSchema: string): string {
  return `You are a JSON schema expert. Modify the provided JSON schema based on the schema change description by the user. Return no other text than a fully valid JSON schema document. No other explanation or words. When appropriate, put sub-schema definitions into the $defs section. The schema to modify is: \`\`\`${fullSchema}\`\`\``;
}

export function buildSchemaQuestionSystemMessage(fullSchema: string): string {
  return `You are a JSON schema expert. Explain/summarize/query the provided JSON schema based on the prompt by the user. The schema to query is: \`\`\`${fullSchema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
}

export function buildDataConversionToJsonSystemMessage(schema: string): string {
  return `You are a JSON schema expert. Convert the data input provided by the user (in any format) into a JSON document which satisfies the following schema: \`\`\`${schema}\`\`\`. Return no other text than a fully valid JSON document satisfying the schema. No other explanation or words.`;
}

export function buildDataConversionFromJsonSystemMessage(jsonData: string, schema: string): string {
  return `You are a JSON schema expert. Convert the JSON document \`\`\`${jsonData}\`\`\` into the format provided by the user. The user will provide a format description or an example file with different data of the target format. The JSON document follows the schema \`\`\`${schema}\`\`\`. Return no other text than a document matching the user provided example or description. No other explanation or words.`;
}

export function buildDataModificationSystemMessage(data: string, schema: string): string {
  return `You are a JSON schema expert. Modify the provided JSON document based on the data change description by the user. Return no other text than a fully valid JSON document. The document to modify is: \`\`\`${data}\`\`\`. The resulting JSON document needs to satisfy the JSON schema \`\`\`${schema}\`\`\``;
}

export function buildDataQuestionSystemMessage(data: string, schema: string): string {
  return `You are a JSON schema expert. Explain/summarize/query the provided JSON document based on the prompt by the user. The document to query is: \`\`\`${data}\`\`\`. The JSON schema for the document is \`\`\`${schema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
}

export function buildSettingsModificationSystemMessage(
  currentSettings: string,
  settingsSchema: string
): string {
  return `You are a JSON schema expert. Modify the provided settings based on the settings change description by the user. Return no other text than a fully valid JSON document. The settings to modify are: \`\`\`${currentSettings}\`\`\`. The resulting JSON document needs to satisfy the JSON schema \`\`\`${settingsSchema}\`\`\``;
}

export function buildSettingsQuestionSystemMessage(data: string, schema: string): string {
  return `You are a JSON schema expert. Explain/summarize/query the user settings of the MetaConfigurator web app based on the prompt by the user. The settings to query is: \`\`\`${data}\`\`\`. The JSON schema for the settings is \`\`\`${schema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
}

export function buildHandlebarsSystemMessage(
  exampleInput: string,
  exampleInputSchema: string,
  exampleOutput: string,
  exampleExpression: string
): string {
  return `You are a JSON and Handlebars Text Templating expert. Your task is to generate a Handlebars Template for transforming the user input JSON document to a text document as desired by the user.
  Only output **valid Handlebars** template syntax. Do not use any other templating language or surrounding text.
  Example input file: \`\`\`${exampleInput}\`\`\`.
  Example input schema: \`\`\`${exampleInputSchema}\`\`\`.
  Example output: \`\`\`${exampleOutput}\`\`\`.
  For these examples you should generate the following Template: \`\`\`${exampleExpression}\`\`\`.
  The output description can also be natural language texts or other data structures (e.g., XML, or other formats), but the output must always be a text document.`;
}

export function buildHandlebarsUserMessage(
  inputFileSubset: string,
  inputFileSchema: string,
  outputDescription: string
): string {
  return `Input file subset: \`\`\`${inputFileSubset}\`\`\`.  
  Input file schema: \`\`\`${inputFileSchema}\`\`\`.
  The goal is to generate a handlebars Template. Description or example of the desired output document: \`\`\`${outputDescription}\`\`\`. Keep it simple and conservative. Avoid adding new values that do not exist.`;
}

export function buildRmlMappingSystemMessage(
  instructions: string,
  exampleInput: string,
  exampleOutputRml: string
): string {
  return `
${instructions}

Example input JSON:
\`\`\`
${exampleInput}
\`\`\`

Example RML mapping:
\`\`\`
${exampleOutputRml}
\`\`\`
`;
}

export function buildRmlMappingUserMessage(inputFileSubset: string, userComments: string): string {
  const userMessage = `
Real input JSON subset:
\`\`\`
${inputFileSubset}
\`\`\`

Requirements:
- Keep the mapping minimal and accurate.
- Only map fields that exist in the input JSON.
- Do not invent values or fields.

Return ONLY the RML mapping in valid Turtle syntax.
`;

  if (!userComments || userComments.length === 0) {
    return userMessage;
  }

  return `${userMessage}

Additional user comments:
\`\`\`
${userComments}
\`\`\`
`;
}

const SPARQL_BASE_SYSTEM_MESSAGE = `
You are a SPARQL expert assistant.

Goal:
Generate a VALID SPARQL query for a JSON-LD/RDF dataset based on the user's intent.

General rules:
1) Do NOT invent prefixes. Use only the provided PREFIX block.
2) Prefer patterns that exist in the input graph.
3) If the user's request is ambiguous, make a sensible assumption and keep the query broad but safe.
4) Do NOT output any explanation. Output ONLY the VALID SPARQL query text.
`.trim();

const SPARQL_VISUALIZATION_SYSTEM_RULES = `
Additional mandatory rules:
- Output MUST be a SPARQL CONSTRUCT query.
- The CONSTRUCT template MUST be EXACTLY:
  CONSTRUCT { ?subject ?predicate ?object . }
  Other construct patterns are NOT allowed.
  DO NOT CHANGE the CONSTRUCT template. Use BIND in the WHERE clause to define ?subject, ?predicate, and ?object.
- The WHERE clause MUST bind ?subject, ?predicate, and ?object.
- ?predicate MUST be an IRI (NamedNode), never a literal.
`.trim();

const SPARQL_SELECT_SYSTEM_RULES = `
Additional mandatory rules:
- Output MUST be a SPARQL SELECT query.
`.trim();

const SPARQL_VISUALIZATION_FALLBACK = `
If the user intent is unclear, use:
CONSTRUCT { ?subject ?predicate ?object . }
WHERE { ?subject ?predicate ?object . }
`.trim();

const SPARQL_SELECT_FALLBACK = `
If the user intent is unclear, use:
SELECT * WHERE { ?s ?p ?o . } LIMIT 100
`.trim();

export function buildSparqlSystemMessage(visualizationMode: boolean): string {
  const modeRules = visualizationMode
    ? SPARQL_VISUALIZATION_SYSTEM_RULES
    : SPARQL_SELECT_SYSTEM_RULES;
  return `${SPARQL_BASE_SYSTEM_MESSAGE}\n\n${modeRules}`;
}

export function buildSparqlUserMessage(
  jsonLdContent: string,
  userComments: string,
  prefixBlock: string,
  visualizationMode: boolean
): string {
  const safePrefixBlock = prefixBlock?.trim() || '(empty)';
  const fallbackQuery = visualizationMode ? SPARQL_VISUALIZATION_FALLBACK : SPARQL_SELECT_FALLBACK;

  return `
PREFIX block (MUST be placed at the very top of your output, verbatim; remove unused final prefixes):
\`\`\`
${safePrefixBlock}
\`\`\`

${fallbackQuery}

JSON-LD content (treat as the only dataset; write a query that works against it):
\`\`\`json
${jsonLdContent}
\`\`\`

User intent / comments:
\`\`\`
${(userComments ?? '').trim() || '(none)'}
\`\`\`
`.trim();
}
