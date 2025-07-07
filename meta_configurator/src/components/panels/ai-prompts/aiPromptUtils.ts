export function fixAndParseGeneratedJson(json: string): any {
  json = fixGeneratedExpression(json);

  try {
    return JSON.parse(json);
  } catch (e) {
    if (hasMoreOpeningBrackets(json)) {
      throw new Error(
        'The JSON has more opening than closing brackets. Probably the allowed maximumTokens for the AI model was reached and the JSON is cut off.'
      );
    } else {
      throw e;
    }
  }
}

export function fixGeneratedExpression(
  json: string,
  expressionTypes: string | string[] = 'json'
): string {
  for (const expressionType of Array.isArray(expressionTypes)
    ? expressionTypes
    : [expressionTypes]) {
    if (json.toLowerCase().startsWith(`\`\`\`${expressionType}`) && json.endsWith('```')) {
      json = json.substring(3 + expressionType.length, json.length - 3);
    }
  }
  if (json.startsWith('```') && json.endsWith('```')) {
    json = json.substring(3, json.length - 3);
  }
  return json;
}

function hasMoreOpeningBrackets(input: string): boolean {
  const openingCount = (input.match(/\{/g) || []).length;
  const closingCount = (input.match(/\}/g) || []).length;

  return openingCount > closingCount;
}

export function getApiKey(): string {
  return localStorage.getItem('openai_api_key') || '';
}
