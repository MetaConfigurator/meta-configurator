const JSON_LD_NODE_KEYWORDS = ['@id', '@type', '@value', '@list', '@set', '@reverse', '@included'];

/** Recognizes compacted, flattened, and expanded JSON-LD documents. */
export function isJsonLdDocument(input: unknown): boolean {
  if (Array.isArray(input)) {
    return input.length > 0 && input.every(isJsonLdNode);
  }
  if (!isObjectRecord(input)) {
    return false;
  }

  if ('@graph' in input) {
    const graph = input['@graph'];
    return Array.isArray(graph) || isObjectRecord(graph);
  }

  const hasContext = '@context' in input;
  const hasDocumentContent = Object.keys(input).some(propertyName => propertyName !== '@context');
  return (hasContext && hasDocumentContent) || isJsonLdNode(input);
}

function isJsonLdNode(value: unknown): boolean {
  return (
    isObjectRecord(value) &&
    JSON_LD_NODE_KEYWORDS.some(keyword => Object.prototype.hasOwnProperty.call(value, keyword))
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
