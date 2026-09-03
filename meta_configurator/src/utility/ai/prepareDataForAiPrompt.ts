import {trimDataToMaxSize} from '@/utility/trimData';

const DEFAULT_MAXIMUM_STRING_LENGTH = 4000;

/** Limits both collection sizes and individual strings before serializing data into an AI prompt. */
export function prepareDataForAiPrompt(
  data: unknown,
  maximumSizeInKiB = 64,
  maximumStringLength = DEFAULT_MAXIMUM_STRING_LENGTH
): unknown {
  return trimDataToMaxSize(truncateLongStrings(data, maximumStringLength), maximumSizeInKiB);
}

/** Keeps raw-text prompts bounded and makes truncation visible to the model. */
export function truncateTextForAiPrompt(text: string, maximumCharacterCount: number): string {
  if (text.length <= maximumCharacterCount) {
    return text;
  }
  return `${text.slice(0, maximumCharacterCount)}...[TRUNCATED_${
    text.length - maximumCharacterCount
  }_CHARS]`;
}

function truncateLongStrings(value: unknown, maximumStringLength: number): unknown {
  if (typeof value === 'string') {
    return truncateTextForAiPrompt(value, maximumStringLength);
  }
  if (Array.isArray(value)) {
    return value.map(item => truncateLongStrings(item, maximumStringLength));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([propertyName, propertyValue]) => [
        propertyName,
        truncateLongStrings(propertyValue, maximumStringLength),
      ])
    );
  }
  return value;
}
