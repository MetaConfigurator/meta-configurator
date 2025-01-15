
export function fixAndParseGeneratedJson(json: string): any {
  if (json.startsWith('```json\n') && json.endsWith('```')) {
    json = json.substring(8, json.length - 3);
  }

  try {
    return JSON.parse(json);
  } catch (e) {

    if (hasMoreOpeningBrackets(json)) {
      throw new Error('The JSON has more opening than closing brackets. Probably the allowed maximumTokens for the AI model was reached and the JSON is cut off.');
    } else {
        throw e;
      }
  }
}

function hasMoreOpeningBrackets(input: string): boolean {
  const openingCount = (input.match(/\{/g) || []).length;
  const closingCount = (input.match(/\}/g) || []).length;

  return openingCount > closingCount;
}


export function getApiKey(): string {
  return localStorage.getItem('openai_api_key') || '';
}