
export function fixAndParseGeneratedJson(json: string): any {
  try {
    return JSON.parse(json);
  } catch (e) {

    if (json.startsWith('```json\n') && json.endsWith('```')) {
      json = json.substring(8, json.length - 3);
      try {
        return JSON.parse(json);
      }
      catch (e) {
        throw e;
      }
    }
  }
}