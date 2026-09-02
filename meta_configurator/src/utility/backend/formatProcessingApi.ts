import {computed} from 'vue';
import {useSettings} from '@/settings/useSettings';
import {getErrorMessage} from '@/utility/getErrorMessage';

const settings = useSettings();

export const FORMAT_PROCESSING_URL = computed(() => {
  return settings.value.backend.formatProcessingUrl.replace(/\/+$/, '');
});

const FORMAT_PROCESSING_DATA_FILE_EXTENSIONS = [
  '.xml',
  '.jsonl',
  '.ndjson',
  '.yml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.properties',
  '.csv',
  '.tsv',
  '.md',
  '.markdown',
  '.ttl',
  '.turtle',
  '.rdf',
  '.star',
  '.mpif',
  '.cif',
  '.mmcif',
  '.mcif',
  '.cpp',
  '.cc',
  '.cxx',
  '.c++',
  '.hpp',
  '.hh',
  '.hxx',
  '.ipp',
  '.tpp',
  '.h',
  '.py',
  '.pyw',
  '.java',
] as const;

export const FORMAT_PROCESSING_FILE_ACCEPT = [
  '.json',
  '.yaml',
  ...FORMAT_PROCESSING_DATA_FILE_EXTENSIONS,
].join(',');

export interface FormatProcessingDetectionResult {
  recognized: boolean;
  format: string;
  parsed_json: unknown;
  preprocessed_for_ai: unknown;
  message: string;
  display_text: string;
  parser_name?: string | null;
  ai_prompt_hint?: string | null;
}

export interface FormatProcessingPreprocessOptions {
  target_document_size_kb?: number;
  initial_array_limit?: number;
  min_array_limit?: number;
  object_key_factor?: number;
  max_string_len?: number;
  max_data_field_len?: number;
}

export interface FormatProcessingPreprocessResult {
  format: string;
  preprocessed_for_ai: unknown;
  display_text: string;
  ai_prompt_hint?: string | null;
}

export function shouldUseFormatProcessingForFile(fileName: string): boolean {
  const normalized = fileName.trim().toLowerCase();
  return FORMAT_PROCESSING_DATA_FILE_EXTENSIONS.some(ext => normalized.endsWith(ext));
}

export async function detectFormatAndParseWithFormatProcessing(
  fileName: string,
  fileType: string,
  content: string
): Promise<FormatProcessingDetectionResult> {
  const responseBody = await postToFormatProcessing('/detect-format-and-parse', {
    file_name: fileName,
    file_type: fileType,
    content,
  });

  if (
    !isObjectRecord(responseBody) ||
    typeof responseBody.recognized !== 'boolean' ||
    typeof responseBody.format !== 'string' ||
    typeof responseBody.message !== 'string' ||
    typeof responseBody.display_text !== 'string' ||
    !isOptionalNullableString(responseBody.parser_name) ||
    !isOptionalNullableString(responseBody.ai_prompt_hint)
  ) {
    throw new Error('Invalid response from the format processing service.');
  }

  return {
    recognized: responseBody.recognized,
    format: responseBody.format,
    parsed_json: responseBody.parsed_json ?? null,
    preprocessed_for_ai: responseBody.preprocessed_for_ai ?? null,
    message: responseBody.message,
    display_text: responseBody.display_text,
    parser_name: getNullableString(responseBody.parser_name),
    ai_prompt_hint: getNullableString(responseBody.ai_prompt_hint),
  };
}

export async function preprocessParsedDataForAiWithFormatProcessing(
  data: unknown,
  format: string = 'json',
  preprocessOptions?: FormatProcessingPreprocessOptions
): Promise<FormatProcessingPreprocessResult> {
  const responseBody = await postToFormatProcessing('/preprocess-for-ai', {
    data,
    format,
    preprocess_options: preprocessOptions,
  });

  if (
    !isObjectRecord(responseBody) ||
    typeof responseBody.format !== 'string' ||
    typeof responseBody.display_text !== 'string' ||
    !isOptionalNullableString(responseBody.ai_prompt_hint)
  ) {
    throw new Error('Invalid response from the format processing service.');
  }

  return {
    format: responseBody.format,
    preprocessed_for_ai: responseBody.preprocessed_for_ai ?? data,
    display_text: responseBody.display_text,
    ai_prompt_hint: getNullableString(responseBody.ai_prompt_hint),
  };
}

async function postToFormatProcessing(
  endpointPath: string,
  requestBody: unknown
): Promise<unknown> {
  let serializedRequestBody: string;
  try {
    serializedRequestBody = JSON.stringify(requestBody);
  } catch (error) {
    throw new Error(
      `Could not serialize the format processing request. (${getErrorMessage(error)})`
    );
  }

  let response: Response;
  try {
    response = await fetch(`${FORMAT_PROCESSING_URL.value}${endpointPath}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: serializedRequestBody,
    });
  } catch (error) {
    throw new Error(
      `Could not reach the format processing service at ${FORMAT_PROCESSING_URL.value}. ` +
        `Please make sure the service is running and reachable. ` +
        `(${getErrorMessage(error)})`
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Unexpected response from the format processing service (status ${response.status}). ` +
        (text ? `Response: ${text.slice(0, 300)}` : 'The response was not JSON.')
    );
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch (error) {
    throw new Error(
      `Format processing service returned invalid JSON (status ${response.status}). ` +
        `(${getErrorMessage(error)})`
    );
  }
  if (!response.ok) {
    const responseError =
      isObjectRecord(responseBody) && typeof responseBody.error === 'string'
        ? responseBody.error
        : `Format processing service request failed with status ${response.status}.`;
    throw new Error(responseError);
  }
  return responseBody;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}
