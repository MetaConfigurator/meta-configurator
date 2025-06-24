import {
  FetchingJSONSchemaStore,
  InputData,
  jsonInputForTargetLanguage,
  JSONSchemaInput,
  quicktype,
} from 'quicktype-core/dist/';

export const SUPPORTED_LANGUAGES = [
  'python',
  'python (pydantic)',
  'typescript',
  'javascript',
  'rust',
  'java',
  'kotlin',
  'swift',
  'dart',
  'go',
  'c++',
  'csharp',
  'php',
  'ruby',
  'scala',
  'flow',
  'elm',
  'objc',
].sort((a, b) => a.localeCompare(b));

export async function quicktypeJSON(targetLanguage: string, typeName: string, jsonString: string) {
  const jsonInput = jsonInputForTargetLanguage(targetLanguage);

  // We could add multiple samples for the same desired
  // type, or many sources for other types. Here we're
  // just making one type from one piece of sample JSON.
  await jsonInput.addSource({
    name: typeName,
    samples: [jsonString],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  return await quicktype({
    inputData,
    lang: targetLanguage,
  });
}

export async function quicktypeJSONSchema(
  targetLanguage: string,
  typeName: string,
  jsonSchemaString: string
) {
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

  // We could add multiple schemas for multiple types,
  // but here we're just making one type from JSON schema.
  await schemaInput.addSource({name: typeName, schema: jsonSchemaString});

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  return await quicktype({
    inputData,
    lang: removeParametersFromLanguage(targetLanguage),
    rendererOptions: getRendererOptions(targetLanguage),
  });
}

export async function generateValidationCode(
  language: string,
  schemaFileName: string,
  instanceFileName: string
) {
  const languageId = formatLanguagesToOnlyAlphaNumerical(removeParametersFromLanguage(language));
  const template = await loadValidationTemplate(languageId);
  if (!template) {
    return undefined;
  }
  return template
    .replaceAll('{{SCHEMA_FILE}}', schemaFileName)
    .replaceAll('{{INSTANCE_FILE}}', instanceFileName);
}

async function loadValidationTemplate(language: string): Promise<string | undefined> {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const response = await fetch(`${base}validation-templates/${language}.txt`);
    if (!response.ok) {
      // File not found or server error
      return undefined;
    }
    return await response.text();
  } catch (error) {
    // Network or other unexpected error
    return undefined;
  }
}

function formatLanguagesToOnlyAlphaNumerical(language: string): string {
  // replace C++ with cpp
  return language.toLowerCase().replace(/c\+\+/, 'cpp');
}

function removeParametersFromLanguage(language: string): string {
  // remove everything after the first space
  const index = language.indexOf(' ');
  if (index !== -1) {
    return language.substring(0, index);
  }
  return language;
}

function getRendererOptions(language: string): any {
  const rendererOptions: any = {};
  if (language.includes('pydantic')) {
    rendererOptions['pydantic-base-model'] = true;
  }
  return rendererOptions;
}
