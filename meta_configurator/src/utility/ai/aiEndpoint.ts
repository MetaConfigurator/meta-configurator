import axios from 'axios';
import {useSettings} from '@/settings/useSettings';

const BASE_URL = 'https://api.openai.com/v1';

export const queryOpenAI = async (
  apiKey: string,
  messages: {role: 'system' | 'user'; content: string}[],
  model: string | undefined = undefined,
  max_tokens: number | undefined = undefined,
  temperature: number | undefined = undefined,
  endpoint: string | undefined = undefined
) => {
  const settings = useSettings().value.aiIntegration;
  if (!model) model = settings.model;
  if (!max_tokens) max_tokens = settings.maxTokens;
  if (!temperature) temperature = settings.temperature;
  if (!endpoint) endpoint = settings.endpoint;

  if (!endpoint.startsWith('https://')) {
    endpoint = `${BASE_URL}/${endpoint}`;
  }
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = `${endpoint}chat/completions`;
  }

  try {
    console.log('Querying OpenAI with messages: ', ...messages);
    const response = await axios.post(
      endpoint,
      {
        model,
        messages,
        max_tokens: max_tokens,
        temperature: temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const resultSchema: string = response.data.choices[0].message.content;
    console.log('Result schema from AI prompt:', resultSchema, 'based on messages:', messages);
    return resultSchema;
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    throw error;
  }
};

export const querySchemaCreation = async (
  apiKey: string,
  schemaDescriptionNaturalLanguage: string
) => {
  const systemMessage = `You are a JSON schema expert. Create a JSON schema based on the schema description by the user. Return no other text than a fully valid JSON schema document. When appropriate, put sub-schema definitions into the $defs section. `;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: schemaDescriptionNaturalLanguage},
  ]);
};

export const querySchemaModification = async (
  apiKey: string,
  schemaChangeDescriptionNaturalLanguage: string,
  fullSchema: string
) => {
  const systemMessage = `You are a JSON schema expert. Modify the provided JSON schema based on the schema change description by the user. Return no other text than a fully valid JSON schema document. No other explanation or words. When appropriate, put sub-schema definitions into the $defs section. The schema to modify is: \`\`\`${fullSchema}\`\`\``;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: schemaChangeDescriptionNaturalLanguage},
  ]);
};

export const querySchemaQuestion = async (
  apiKey: string,
  schemaQueryNaturalLanguage: string,
  fullSchema: string
) => {
  const systemMessage = `You are a JSON schema expert. Explain/summarize/query the provided JSON schema based on the prompt by the user. The schema to query is: \`\`\`${fullSchema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: schemaQueryNaturalLanguage},
  ]);
};

export const queryDataConversionToJson = async (
  apiKey: string,
  dataInOtherFormat: string,
  schema: string
) => {
  const systemMessage = `You are a JSON schema expert. Convert the data input provided by the user (in any format) into a JSON document which satisfies the following schema: \`\`\`${schema}\`\`\`. Return no other text than a fully valid JSON document satisfying the schema. No other explanation or words.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: dataInOtherFormat},
  ]);
};

export const queryDataConversionFromJson = async (
  apiKey: string,
  descriptionOrDataInOtherFormat: string,
  jsonData: string,
  schema: string
) => {
  const systemMessage = `You are a JSON schema expert. Convert the JSON document \`\`\`${jsonData}\`\`\` into the format provided by the user. The user will provide a format description or an example file with different data of the target format. The JSON document follows the schema \`\`\`${schema}\`\`\`. Return no other text than a document matching the user provided example or description. No other explanation or words.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: descriptionOrDataInOtherFormat},
  ]);
};

export const queryDataModification = async (
  apiKey: string,
  dataChangeDescriptionNaturalLanguage: string,
  data: string,
  schema: string
) => {
  const systemMessage = `You are a JSON schema expert. Modify the provided JSON document based on the data change description by the user. Return no other text than a fully valid JSON document. The document to modify is: \`\`\`${data}\`\`\`. The resulting JSON document needs to satisfy the JSON schema \`\`\`${schema}\`\`\``;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: dataChangeDescriptionNaturalLanguage},
  ]);
};

export const queryDataQuestion = async (
  apiKey: string,
  dataQuestionNaturalLanguage: string,
  data: string,
  schema: string
) => {
  const systemMessage = `You are a JSON schema expert. Explain/summarize/query the provided JSON document based on the prompt by the user. The document to query is: \`\`\`${data}\`\`\`. The JSON schema for the document is \`\`\`${schema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: dataQuestionNaturalLanguage},
  ]);
};

export const querySettingsModification = async (
  apiKey: string,
  settingsChangeDescriptionNaturalLanguage: string,
  currentSettings: string,
  settingsSchema: string
) => {
  const systemMessage = `You are a JSON schema expert. Modify the provided settings based on the settings change description by the user. Return no other text than a fully valid JSON document. The settings to modify are: \`\`\`${currentSettings}\`\`\`. The resulting JSON document needs to satisfy the JSON schema \`\`\`${settingsSchema}\`\`\``;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: settingsChangeDescriptionNaturalLanguage},
  ]);
};

export const querySettingsQuestion = async (
  apiKey: string,
  settingsQuestionNaturalLanguage: string,
  data: string,
  schema: string
) => {
  const systemMessage = `You are a JSON schema expert. Explain/summarize/query the user settings of the MetaConfigurator web app based on the prompt by the user. The settings to query is: \`\`\`${data}\`\`\`. The JSON schema for the settings is \`\`\`${schema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: settingsQuestionNaturalLanguage},
  ]);
};

export const queryDataMappingConfig = async (
  apiKey: string,
  dataMappingConfigSchema: string,
  dataMappingConfigExample: string,
  inputFileSchema: string,
  targetSchema: string,
  inputFileSubset: string,
  possibleSourcePaths: string[],
  userComments: string
) => {
  const systemMessage = `You are a JSON expert. Your task is to generate a data mapping configuration JSON document.

This document must be a valid *instance* that follows the schema defined by \`\`\`${dataMappingConfigSchema}\`\`\`.

You must NOT output a JSON Schema or include any \`$schema\`, \`type\`, \`properties\`, or similar schema-related keywords. 
The result must only be a concrete instance, like the following example: \`\`\`${dataMappingConfigExample}\`\`\`.

The configuration maps data from an input file (with known schema and example subset) to match the structure of a target schema.

Return ONLY a valid JSON object (no surrounding text or explanation).`;

  let userMessage = `The input file follows this schema: \`\`\`${inputFileSchema}\`\`\`.  
The goal is to map it to match this target schema: \`\`\`${targetSchema}\`\`\`.  
To help with the mapping, here is a subset of the input file: \`\`\`${inputFileSubset}\`\`\`.
Here is a list of possible source paths to use in the mapping config: \`\`\`${possibleSourcePaths.join(
    ', '
  )}\`\`\``;

  if (userComments && userComments.length > 0) {
    userMessage += `  
User comments for clarification: \`\`\`${userComments}\`\`\``;
  }
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
};

export const queryJsonataExpression = async (
  apiKey: string,
  jsonataReferenceGuide: string,
  exampleInput: string,
  exampleInputSchema: string,
  exampleOutput: string,
  exampleOutputSchema: string,
  exampleExpression: string,
  inputFileSubset: string,
  inputFileSchema: string,
  targetSchema: string,
  userComments: string
) => {
  const systemMessage = `You are a JSON and JSONata Data Mapping expert. Your task is to generate a JSONata expression for transforming the user input document to satisfy the given output JSON schema.
  Only output **valid JSONata**, which is a single JSON-like expression. Do not use multi-line functions, JavaScript-style blocks, or function declarations like "function($x) {...}". JSONata only supports inline expressions, conditionals, filters, maps, and built-in functions.
  Remember: JSONata is a declarative query and transformation language with syntax similar to JSON. It does **not** support full function declarations. Transformations must be inline.
  \`\`\`${jsonataReferenceGuide}\`\`\`
  Example input file: \`\`\`${exampleInput}\`\`\`.
  Example input schema: \`\`\`${exampleInputSchema}\`\`\`.
  Example output schema: \`\`\`${exampleOutputSchema}\`\`\`.
  For these examples you should generate the following JSONata expression: \`\`\`${exampleExpression}\`\`\`.
  The expression would transform the input file to the following output file (as intended): \`\`\`${exampleOutput}\`\`\`.
  The JSONata expression/transformation maps data from an input file (with known schema and example subset) to match the structure of a target schema.
  Return ONLY a valid JSONata expression (no surrounding text or explanation).`;

  let userMessage = `Real input file subset: \`\`\`${inputFileSubset}\`\`\`.  
  Input file schema: \`\`\`${inputFileSchema}\`\`\`.
  The goal is to generate an expression to make JSONata transform the input to satisfy this output schema: \`\`\`${targetSchema}\`\`\`. Keep it simple and conservative. Avoid adding new values that do not exist or using overly complex JSONata features.
  Return a prettified, multi-line JSONata expression, with no extra text or explanation.`;

  if (userComments && userComments.length > 0) {
    userMessage += `  
User comments for clarification: \`\`\`${userComments}\`\`\``;
  }
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
};

export const queryHandlebarsTemplate = async (
  apiKey: string,
  exampleInput: string,
  exampleInputSchema: string,
  exampleOutput: string,
  exampleExpression: string,
  inputFileSubset: string,
  inputFileSchema: string,
  outputDescription: string
) => {
  const systemMessage = `You are a JSON and Handlebars Text Templating expert. Your task is to generate a Handlebars Template for transforming the user input JSON document to a text document as desired by the user.
  Only output **valid Handlebars** template syntax. Do not use any other templating language or surrounding text.
  Example input file: \`\`\`${exampleInput}\`\`\`.
  Example input schema: \`\`\`${exampleInputSchema}\`\`\`.
  Example output: \`\`\`${exampleOutput}\`\`\`.
  For these examples you should generate the following Template: \`\`\`${exampleExpression}\`\`\`.
  The output description can also be natural language texts or other data structures (e.g., XML, or other formats), but the output must always be a text document.`;

  let userMessage = `Input file subset: \`\`\`${inputFileSubset}\`\`\`.  
  Input file schema: \`\`\`${inputFileSchema}\`\`\`.
  The goal is to generate a handlebars Template. Description or example of the desired output document: \`\`\`${outputDescription}\`\`\`. Keep it simple and conservative. Avoid adding new values that do not exist.`;

  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
};

export const queryRmlMapping = async (
  apiKey: string,
  exampleInput: string,
  exampleInputSchema: string,
  exampleOutputRml: string,
  inputFileSubset: string,
  inputFileSchema: string,
  targetSchema: string,
  userComments: string
) => {
  const systemMessage = `You are an assistant that generates RML mappings (in Turtle syntax) that convert a given JSON input into RDF. 
  Follow the RML spec rules for JSON sources (use 'ql:JSONPath' as the reference formulation and JSONPath iterators). Always produce only valid Turtle output (the mapping), nothing else (no commentary).
  Input I will provide (fill these in or expect them in the same message):
  - A small representative JSON document (or a path to the JSON file).
  - Use 'Data.json' for 'rml:source'.
  - 'prefixes': map of prefix → IRI to include (e.g. 'ex: http://example.com/ns#', 'rr: http://www.w3.org/ns/r2rml#', 'rml: http://semweb.mmlab.be/ns/rml#', 'ql: http://semweb.mmlab.be/ns/ql#').
  - 'base_iri' (optional): base IRI used for '@base' or 'rr:template' generation.
  - 'iterator' (optional): JSONPath iterator string — default is '$.<...>' covering the repeating objects (e.g. '$.items[*]').
  - 'subject_template' or 'subject_rules': either a template like 'http://example.com/{id}' or rules to build the subject (use template or 'rr:termType rr:BlankNode').
  - 'mappings': a list describing how JSON fields map to RDF — each item should include:
    - 'predicate' (as a full IRI or prefixed name)
    - 'reference' (JSONPath, relative to iterator — for RML use 'rml:reference "fieldName"' where fieldName matches JSONPath inside iterator, e.g. 'name' for '$.items[*].name').
    - optional 'datatype' (xsd type)
    - optional 'language'
    - optional 'termType' (IRI, Literal, BlankNode)
    - optional 'template' (for object IRIs built from multiple fields)
  - Optionally: 'type_triples' (classes to attach via 'rr:class') and 'nested_mappings' for nested objects/arrays (create parent/child 'rr:RefObjectMap' with join conditions if needed).

  Rules the you must follow
  1. Use 'rml:logicalSource' with:
     - 'rml:source' = 'Data.json'
     - 'rml:referenceFormulation ql:JSONPath'
     - 'rml:iterator' = the provided iterator (or a sensible default)
  2. Create one 'rr:TriplesMap' per repeating object (or more, if user supplies multiple logical sources).
  3. For each TriplesMap:
     - Include exactly one 'rr:subjectMap' using either:
       - 'rr:template' for IRI subjects (e.g. 'rr:template "http://example.com/{id}"'), and/or
       - 'rr:termType rr:BlankNode' for blank node subjects, and/or
       - 'rr:constant' where requested.
     - Add 'rr:class' statements when user asks for types.
     - For each mapping item create a 'rr:predicateObjectMap' with 'rr:predicate' and an 'rr:objectMap' using:
       - 'rml:reference' for JSON field references (the RML JSONPath reference is the field *name* relative to the iterator)
       - 'rr:datatype' or 'rr:termType' or language tag if provided
       - 'rr:template' if the object should be constructed from multiple fields
  4. If nested objects/arrays must be mapped to separate resources, create an additional TriplesMap for the nested logical source with its own iterator and logical source and link them using 'rr:RefObjectMap' + 'rr:joinCondition' (use 'rr:child' and 'rr:parent' keys for the join).
  5. Use only the 'prefixes' the user provided plus the standard RML/R2RML prefixes if not present: 'rml:', 'rr:', 'ql:', 'rdf:', 'xsd:'. Put them at the top of the Turtle output.
  6. Keep Turtle compact and readable (use '[]' blank node syntax for inline maps when appropriate).
  7. Do not produce any natural-language explanation in the output — only Turtle content.

  Required output
  - A single Turtle document that:
    - Declares prefixes and optional base.
    - Contains one or more 'rr:TriplesMap' resources with 'rml:logicalSource', 'rr:subjectMap', 'rr:predicateObjectMap' entries as described above.
  - Use 'ql:JSONPath' for 'rml:referenceFormulation'.
  - Ensure 'rml:reference' uses the JSON field name relative to the tripes map iterator (no leading '$.' inside 'rml:reference' value — only the property name or path within the iterator).
  - If the user supplied datatypes or language tags, include them with 'rr:datatype' or 'rr:language'.

  Example input JSON: \`\`\`${exampleInput}\`\`\`
  Example input schema: \`\`\`${exampleInputSchema}\`\`\`
  Example output RML mapping: \`\`\`${exampleOutputRml}\`\`\`
  Use these examples to understand how the mapping relates input data to the RDF output.`;

  let userMessage = `Real input JSON subset: \`\`\`${inputFileSubset}\`\`\`
  Input file schema: \`\`\`${inputFileSchema}\`\`\`
  The goal is to generate an RML mapping (TTL) that transforms this input to match the target RDF schema: \`\`\`${targetSchema}\`\`\`
  Keep the mapping minimal, accurate, and only map existing fields. Avoid generating values not present in the input.
  Return ONLY valid RML mapping in Turtle format, with proper prefixes and structure, no extra text or explanation.`;

  if (userComments && userComments.length > 0) {
    userMessage += `User comments for clarification: \`\`\`${userComments}\`\`\``;
  }

  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
};
