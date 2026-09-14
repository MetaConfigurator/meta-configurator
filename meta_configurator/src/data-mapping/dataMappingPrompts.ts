import type {
  MappingGenerationLanguage,
  MappingGenerationMethod,
} from '@/data-mapping/dataMappingAi';
import {JAVASCRIPT_MAPPING_SYSTEM_MESSAGE} from '@/data-mapping/javascript/javascriptExamples';
import {JSONATA_MAPPING_SYSTEM_MESSAGE} from '@/data-mapping/jsonata/jsonataExamples';

/** The mapping language as it is named towards the user. */
export const LANGUAGE_LABELS: Record<MappingGenerationLanguage, string> = {
  jsonata: 'JSONata',
  javascript: 'JavaScript',
};

/** Markdown code fences the LLM tends to wrap the generated mapping in. */
export const CODE_FENCE_LANGUAGES: Record<MappingGenerationLanguage, string[]> = {
  jsonata: ['jsonata', 'json'],
  javascript: ['javascript', 'js'],
};

export const SYSTEM_MESSAGES: Record<MappingGenerationLanguage, string> = {
  jsonata: JSONATA_MAPPING_SYSTEM_MESSAGE,
  javascript: JAVASCRIPT_MAPPING_SYSTEM_MESSAGE,
};

export const DIRECT_AI_MAPPING_SYSTEM_MESSAGE = [
  'You are a JSON data transformation expert.',
  'Transform the provided JSON document so that the result strictly satisfies the target JSON schema.',
  'Return ONLY valid JSON. No markdown. No explanation.',
  'Preserve information conservatively when possible, but target schema compliance has priority.',
  'Never omit required properties. If a required value cannot be derived, use null or a conservative default that matches the schema type.',
].join('\n');

/** Closes the user message with what the LLM should produce from the given sections. */
export const CLOSING_INSTRUCTIONS: Record<
  MappingGenerationLanguage,
  Record<MappingGenerationMethod, string[]>
> = {
  jsonata: {
    'source-data': [
      'Generate a multi-line JSONata expression that transforms the input data to satisfy the target schema.',
      'Use the actual input data preview, its schema when provided, and the target schema.',
      'Return only the JSONata expression.',
    ],
    'inferred-source-schema': [
      'Generate a multi-line JSONata expression that maps documents matching the source schema to the target schema.',
      'If the source schema contains examples, use them as hints.',
      'Do not assume fields that are not described by the source schema.',
      'Return only the JSONata expression.',
    ],
  },
  javascript: {
    'source-data': [
      'Generate the JavaScript mapping code now.',
      'Use the actual input data preview, its schema when provided, and the target schema.',
      'Remember: output ONLY code that defines function transform(input) { ... } and returns the result object.',
    ],
    'inferred-source-schema': [
      'Generate the JavaScript mapping code now.',
      'The function must accept input documents matching the source schema and return output that satisfies the target schema.',
      'If the source schema contains examples, use them as hints.',
      'Do not rely on runtime data examples beyond the source schema.',
      'Remember: output ONLY code that defines function transform(input) { ... } and returns the result object.',
    ],
  },
};
