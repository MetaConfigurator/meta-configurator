import {describe, expect, it} from 'vitest';
import {isJsonLdDocument} from '@/utility/rdf/isJsonLdDocument';

describe('isJsonLdDocument', () => {
  it('recognizes compacted JSON-LD with a context', () => {
    expect(
      isJsonLdDocument({
        '@context': {schema: 'https://schema.org/'},
        '@id': 'https://example.org/person/1',
        'schema:name': 'Ada',
      })
    ).toBe(true);
  });

  it('recognizes expanded JSON-LD graphs without a context', () => {
    expect(
      isJsonLdDocument({
        '@graph': [
          {
            '@id': 'https://example.org/person/1',
            'https://schema.org/name': [{'@value': 'Ada'}],
          },
        ],
      })
    ).toBe(true);
  });

  it('recognizes an expanded top-level node and node array', () => {
    const expandedNode = {
      '@id': 'https://example.org/person/1',
      'https://schema.org/name': [{'@value': 'Ada'}],
    };

    expect(isJsonLdDocument(expandedNode)).toBe(true);
    expect(isJsonLdDocument([expandedNode])).toBe(true);
  });

  it('does not classify arbitrary JSON as JSON-LD', () => {
    expect(isJsonLdDocument({name: 'Ada'})).toBe(false);
    expect(isJsonLdDocument([{name: 'Ada'}])).toBe(false);
    expect(isJsonLdDocument({'@context': {schema: 'https://schema.org/'}})).toBe(false);
  });
});
