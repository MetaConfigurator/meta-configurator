import {computed} from 'vue';
import {useSettings} from '@/settings/useSettings';

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
  const url = `${FORMAT_PROCESSING_URL.value}/detect-format-and-parse`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        file_name: fileName,
        file_type: fileType,
        content,
      }),
    });
  } catch (error) {
    throw new Error(
      `Could not reach the format processing service at ${FORMAT_PROCESSING_URL.value}. ` +
        `Please make sure the service is running and reachable. ` +
        `(${error instanceof Error ? error.message : String(error)})`
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Unexpected response from the format processing service (status ${response.status}). ` +
        (text ? `Response: ${text.slice(0, 300)}` : 'The response was not JSON.')
    );
  }

  const body = (await response.json()) as Partial<FormatProcessingDetectionResult> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      body.error || `Format processing service request failed with status ${response.status}.`
    );
  }

  if (
    typeof body.recognized !== 'boolean' ||
    typeof body.format !== 'string' ||
    typeof body.message !== 'string' ||
    typeof body.display_text !== 'string'
  ) {
    throw new Error('Invalid response from the format processing service.');
  }

  return {
    recognized: body.recognized,
    format: body.format,
    parsed_json: body.parsed_json ?? null,
    preprocessed_for_ai: body.preprocessed_for_ai ?? null,
    message: body.message,
    display_text: body.display_text,
    parser_name: body.parser_name ?? null,
    ai_prompt_hint: body.ai_prompt_hint ?? null,
  };
}

export async function preprocessParsedDataForAiWithFormatProcessing(
  data: unknown,
  format: string = 'json',
  preprocessOptions?: FormatProcessingPreprocessOptions
): Promise<FormatProcessingPreprocessResult> {
  const url = `${FORMAT_PROCESSING_URL.value}/preprocess-for-ai`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        data,
        format,
        preprocess_options: preprocessOptions,
      }),
    });
  } catch (error) {
    throw new Error(
      `Could not reach the format processing service at ${FORMAT_PROCESSING_URL.value}. ` +
        `Please make sure the service is running and reachable. ` +
        `(${error instanceof Error ? error.message : String(error)})`
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Unexpected response from the format processing service (status ${response.status}). ` +
        (text ? `Response: ${text.slice(0, 300)}` : 'The response was not JSON.')
    );
  }

  const body = (await response.json()) as Partial<FormatProcessingPreprocessResult> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      body.error || `Format processing service request failed with status ${response.status}.`
    );
  }

  if (typeof body.format !== 'string' || typeof body.display_text !== 'string') {
    throw new Error('Invalid response from the format processing service.');
  }

  return {
    format: body.format,
    preprocessed_for_ai: body.preprocessed_for_ai ?? data,
    display_text: body.display_text,
    ai_prompt_hint: body.ai_prompt_hint ?? null,
  };
}
