export function findJsonLdPrefixes(dataOrSchema: any): [string, string][] {
  const result: [string, string][] = [];

  if (dataOrSchema['@context']) {
    for (const [key, value] of Object.entries(dataOrSchema['@context'])) {
      if (typeof value === 'string') {
        result.push([key, value]);
      } else if (typeof value === 'object') {
        const contextElement: any = value;
        if (contextElement['@id'] && typeof contextElement['@id'] === 'string') {
          result.push([key, contextElement['@id']]);
        }
      }
    }
  }

  return result;
}
