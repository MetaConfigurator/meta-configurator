import {computed} from 'vue';
import {useSettings} from '@/settings/useSettings';
import {isObjectRecord, postJsonToBackend} from '@/utility/backend/backendJsonRequest';

const settings = useSettings();

export const FORMAT_PROCESSING_URL = computed(() => {
  return settings.value.backend.formatProcessingUrl.replace(/\/+$/, '');
});

const FORMAT_PROCESSING_DATA_FILE_EXTENSIONS = [
  '.xml',
  '.jsonl',
  '.ndjson',
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
] as const;

/** The formats only the format processing service can parse, for "Import Other Data". */
export const FORMAT_PROCESSING_FILE_ACCEPT = FORMAT_PROCESSING_DATA_FILE_EXTENSIONS.join(',');

/** Every format the AI import dialog accepts: locally parsed ones and backend-only ones. */
export const AI_IMPORT_FILE_ACCEPT = [
  '.json',
  '.yaml',
  '.yml',
  ...FORMAT_PROCESSING_DATA_FILE_EXTENSIONS,
].join(',');

export interface FormatProcessingDetectionResult {
  recognized: boolean;
  format: string;
  parsed_json: unknown;
  preprocessed_for_ai: unknown;
  message: string;
  parser_name?: string | null;
  ai_prompt_hint?: string | null;
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
    parser_name: getNullableString(responseBody.parser_name),
    ai_prompt_hint: getNullableString(responseBody.ai_prompt_hint),
  };
}

async function postToFormatProcessing(
  endpointPath: string,
  requestBody: unknown
): Promise<unknown> {
  return postJsonToBackend({
    baseUrl: FORMAT_PROCESSING_URL.value,
    endpointPath,
    requestBody,
    serviceName: 'format processing service',
  });
}

function getNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}
