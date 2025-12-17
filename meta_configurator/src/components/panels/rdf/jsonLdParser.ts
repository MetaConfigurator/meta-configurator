import * as $rdf from 'rdflib';

interface ASTNode {
  value: any;
  path: (string | number)[];
  children: ASTNode[];
}

const PREDICATE_ALIAS_MAP: Record<string, readonly string[]> = {
  '@type': ['rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],
  '@id': ['http://www.w3.org/1999/02/22-rdf-syntax-ns#ID'],
} as const;

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

  buildAST(value: any, path: (string | number)[] = []): ASTNode {
    const node: ASTNode = {value, path, children: []};
    if (Array.isArray(value)) {
      value.forEach((it, i) => node.children.push(this.buildAST(it, [...path, i])));
    } else if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) {
        node.children.push(this.buildAST(value[k], [...path, k]));
      }
    }
    return node;
  }

  private expandTerm(term: string): string | null {
    if (!term || typeof term !== 'string') return null;

    const [prefix, suffix] = term.split(':');
    if (suffix !== undefined && this.context[prefix!]) {
      const base = this.context[prefix!];
      if (typeof base === 'string') {
        return base + suffix;
      }
    }

    return null;
  }

  indexById(ast: ASTNode, map: Map<string, ASTNode[]> = new Map()) {
    if (ast.value && typeof ast.value === 'object' && '@id' in ast.value) {
      const id = ast.value['@id'];
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(ast);
    }
    for (const c of ast.children) this.indexById(c, map);
    return map;
  }

  searchPredicateObject(
    node: ASTNode,
    predicate: string,
    object: string
  ): (string | number)[] | null {
    for (const child of node.children) {
      const last = child.path[child.path.length - 1];
      if (last === predicate) {
        if (
          child.value === object ||
          (typeof child.value !== 'object' && String(child.value) === object)
        ) {
          return child.path.slice();
        }

        if (child.value && typeof child.value === 'object' && '@value' in child.value) {
          if (String(child.value['@value']) === object) {
            return [...child.path, '@value'];
          }
        }

        if (child.value && typeof child.value === 'object' && '@id' in child.value) {
          if (child.value['@id'] === object) return [...child.path, '@id'];

          const idChild = child.children.find(
            gc => gc.path[gc.path.length - 1] === '@id' && gc.value === object
          );
          if (idChild) return idChild.path.slice();
        }

        if (Array.isArray(child.value)) {
          for (const elemNode of child.children) {
            if (elemNode.value === object) return elemNode.path.slice();

            if (elemNode.value && typeof elemNode.value === 'object') {
              if (elemNode.value['@id'] === object) return [...elemNode.path, '@id'];

              const idChild = elemNode.children.find(
                gc => gc.path[gc.path.length - 1] === '@id' && gc.value === object
              );
              if (idChild) return idChild.path.slice();
            }
          }
        }
      }

      const deeper = this.searchPredicateObject(child, predicate, object);
      if (deeper) return deeper;
    }
    return null;
  }

  findPath(statement: $rdf.Statement): (string | number)[] | null {
    const ast = this.buildAST(JSON.parse(this.text));
    const idIndex = this.indexById(ast);
    const subjectNodes = idIndex.get(statement.subject.value);
    if (!subjectNodes) return null;
    const predicateEquivs = this.getEquivalentTerms(statement.predicate.value);
    const objectEquivs = this.getEquivalentTerms(statement.object.value);
    for (const sn of subjectNodes) {
      for (const pred of predicateEquivs) {
        for (const obj of objectEquivs) {
          const found = this.searchPredicateObject(sn, pred, obj);
          if (found) return found;
        }
      }
    }
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
    const expanded = this.expandTerm(term);
    if (expanded) out.add(expanded);

    const compact = this.compactTerm(term);
    if (compact) out.add(compact);

    if (PREDICATE_ALIAS_MAP[term]) {
      for (const alias of PREDICATE_ALIAS_MAP[term]) out.add(alias);
    }

    for (const key in PREDICATE_ALIAS_MAP) {
      for (const value of PREDICATE_ALIAS_MAP[key]!) {
        if (value === term) out.add(key);
      }
    }

    return out;
  }
}
