import * as $rdf from 'rdflib';

export class JsonLdParser {
  private text: string = '';
  private context: Record<string, any> = {};

  constructor(jsonLdText: string) {
    this.text = jsonLdText;

    try {
      const json = JSON.parse(jsonLdText);
      if (json['@context']) {
        this.context = json['@context'];
      }
    } catch (err) {
      console.warn('Failed to parse JSON-LD text for context:', err);
      this.context = {};
    }
  }

  getText() {
    return this.text;
  }

  findPath(statement: $rdf.Statement): (string | number)[] | null {
    const json = JSON.parse(this.text);
    const subjectEquivs = this.getEquivalentTerms(statement.subject.value);
    const predicateEquivs = this.getEquivalentTerms(statement.predicate.value);
    const objectEquivs = this.getEquivalentTerms(statement.object.value);

    return this.findPathInJson(json, [], subjectEquivs, predicateEquivs, objectEquivs);
  }

  private findPathInJson(
    value: any,
    path: (string | number)[],
    subjectEquivs: Set<string>,
    predicateEquivs: Set<string>,
    objectEquivs: Set<string>
  ): (string | number)[] | null {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const found = this.findPathInJson(
          value[i],
          [...path, i],
          subjectEquivs,
          predicateEquivs,
          objectEquivs
        );
        if (found) return found;
      }
      return null;
    }

    if (!value || typeof value !== 'object') return null;

    if (typeof value['@id'] === 'string' && subjectEquivs.has(value['@id'])) {
      const inNode = this.findPathInNode(value, path, predicateEquivs, objectEquivs);
      if (inNode) return inNode;
    }

    for (const key of Object.keys(value)) {
      const found = this.findPathInJson(
        value[key],
        [...path, key],
        subjectEquivs,
        predicateEquivs,
        objectEquivs
      );
      if (found) return found;
    }

    return null;
  }

  private findPathInNode(
    node: Record<string, any>,
    nodePath: (string | number)[],
    predicateEquivs: Set<string>,
    objectEquivs: Set<string>
  ): (string | number)[] | null {
    for (const key of Object.keys(node)) {
      if (!predicateEquivs.has(key)) continue;
      const match = this.matchObjectValue(node[key], [...nodePath, key], objectEquivs);
      if (match) return match;
    }
    return null;
  }

  private matchObjectValue(
    value: any,
    basePath: (string | number)[],
    objectEquivs: Set<string>
  ): (string | number)[] | null {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const found = this.matchObjectValue(value[i], [...basePath, i], objectEquivs);
        if (found) return found;
      }
      return null;
    }

    if (value && typeof value === 'object') {
      if (typeof value['@id'] === 'string' && objectEquivs.has(value['@id'])) {
        return [...basePath, '@id'];
      }
      if ('@value' in value && objectEquivs.has(String(value['@value']))) {
        return [...basePath, '@value'];
      }
      return null;
    }

    const normalized = String(value);
    if (objectEquivs.has(normalized)) return basePath;

    return null;
  }

  private compactTerm(fullIri: string): string | null {
    if (!fullIri || typeof fullIri !== 'string') return null;
    for (const prefix in this.context) {
      const base = this.context[prefix];
      if (typeof base === 'string' && fullIri.startsWith(base)) {
        return `${prefix}:${fullIri.slice(base.length)}`;
      }
    }
    return null;
  }

  private getEquivalentTerms(term: string): Set<string> {
    const out = new Set<string>();
    out.add(term);
    const compact = this.compactTerm(term);
    if (compact) out.add(compact);
    return out;
  }
}
