import { parseTree, findNodeAtLocation, modify, applyEdits } from 'jsonc-parser';
import * as $rdf from 'rdflib';
import * as jsonld from 'jsonld';
import type { ParseError } from 'jsonc-parser';

type JSONValue = any;

interface ASTNode {
  value: JSONValue;
  path: (string | number)[];
  children: ASTNode[];
}

export class JsonLdNodeManager {
  private tree: any = null;
  private text: string = '';
  private nodePositions: { [id: string]: { index: number; node: any } } = {};
  private context: Record<string, any> = {};

  constructor(jsonLdText: string) {
    this.text = jsonLdText;

    // Extract @context from JSON-LD text
    try {
      const json = JSON.parse(jsonLdText);
      if (json['@context']) {
        this.context = json['@context'];
      }
    } catch (err) {
      console.warn('Failed to parse JSON-LD text for context:', err);
      this.context = {};
    }

    const errors: ParseError[] = [];
    this.tree = parseTree(this.text, errors);

    this.buildNodePositions();
  }

  /** Build mapping: @id -> node AST and index in @graph */
  private buildNodePositions() {
    this.nodePositions = {};

    const graphNode = findNodeAtLocation(this.tree, ['@graph']);
    if (!graphNode || graphNode.type !== 'array') return;

    graphNode.children?.forEach((node, index) => {
      const idNode = findNodeAtLocation(node, ['@id']);
      if (idNode?.value) {
        this.nodePositions[idNode.value] = { index, node };
      }
    });
  }

  /** Rebuild node content using RDF store and internal @context */
  async rebuildNode(subjectId: string, store: $rdf.IndexedFormula) {
    const triples = store.statements.filter(st => st.subject.value === subjectId);
    if (!triples.length) {
      this.removeNode(subjectId);
      return;
    }
    const nquads = triples
      .map(st => `${st.subject.toNT()} ${st.predicate.toNT()} ${st.object.toNT()} .`)
      .join('\n');

    let jsonLdNodes = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
    let updatedNode = jsonLdNodes[0];

    // Compact using the extracted @context
    if (this.context) {
      updatedNode = await jsonld.compact(updatedNode, this.context);
    }
    delete updatedNode['@context'];
    this.replaceNode(subjectId, updatedNode);
  }

  /** Replace full node object */
  /** Replace full node object — if node not found, append it to @graph (or create @graph) */
  replaceNode(subjectId: string, newNode: any) {
    const nodeInfo = this.nodePositions[subjectId];

    let edits;
    const formattingOptions = { insertSpaces: true, tabSize: 2 };

    if (nodeInfo) {
      // existing node — replace in-place
      edits = modify(this.text, ['@graph', nodeInfo.index], newNode, {
        formattingOptions,
      });
    } else {
      // node doesn't exist — append to @graph (or create @graph if missing)
      const graphNode = findNodeAtLocation(this.tree, ['@graph']);

      if (!graphNode) {
        // no @graph property -> create @graph with an array containing the new node
        edits = modify(this.text, ['@graph'], [newNode], {
          formattingOptions,
        });
      } else {
        // append to existing @graph array: insert at index = current length
        const insertIndex = graphNode.children ? graphNode.children.length : 0;
        edits = modify(this.text, ['@graph', insertIndex], newNode, {
          formattingOptions,
        });
      }
    }

    // Apply edits and refresh AST + positions
    this.text = applyEdits(this.text, edits);
    this.tree = parseTree(this.text);
    this.buildNodePositions();
  }

  /** Remove the node completely from @graph */
  private removeNode(subjectId: string) {
    const nodeInfo = this.nodePositions[subjectId];
    if (!nodeInfo) return; // already gone

    const edits = modify(this.text, ['@graph', nodeInfo.index], undefined, {
      formattingOptions: { insertSpaces: true, tabSize: 2 },
    });

    this.text = applyEdits(this.text, edits);

    // Refresh AST + positions
    this.tree = parseTree(this.text);
    this.buildNodePositions();
  }

  getText() {
    return this.text;
  }

  buildAST(value: JSONValue, path: (string | number)[] = []): ASTNode {
    const node: ASTNode = { value, path, children: [] };
    if (Array.isArray(value)) {
      value.forEach((it, i) => node.children.push(this.buildAST(it, [...path, i])));
    } else if (value && typeof value === "object") {
      for (const k of Object.keys(value)) {
        node.children.push(this.buildAST(value[k], [...path, k]));
      }
    }
    return node;
  }

  // Index ALL AST nodes that have an @id (including embedded occurences)
  indexById(ast: ASTNode, map: Map<string, ASTNode[]> = new Map()) {
    if (ast.value && typeof ast.value === "object" && "@id" in ast.value) {
      const id = ast.value["@id"];
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(ast);
    }
    for (const c of ast.children) this.indexById(c, map);
    return map;
  }

  /**
   * Search for a predicate->object match inside a subject AST node.
   * Returns full path to the matching value:
   *  - For literal objects: path to the literal (e.g. ["@graph",1,".../name"])
   *  - For object-by-@id: path to the @id (e.g. ["@graph",1,".../knows","@id"])
   */
  searchPredicateObject(
    node: ASTNode,
    predicate: string,
    object: string
  ): (string | number)[] | null {
    // iterate direct children - faster shallow checks first
    for (const child of node.children) {
      const last = child.path[child.path.length - 1];

      // If this child is the predicate key
      if (last === predicate) {
        // Case A: primitive literal directly
        if (
          child.value === object ||
          (typeof child.value !== "object" && String(child.value) === object)
        ) {
          return child.path.slice(); // path to literal
        }

        // Case B: predicate value is an object with @id
        if (child.value && typeof child.value === "object" && "@id" in child.value) {
          if (child.value["@id"] === object) {
            // return path to the @id inside that object
            return [...child.path, "@id"];
          }
          // maybe the @id is deeper (rare) — check child.children for @id node
          const idChild = child.children.find(
            (gc) => gc.path[gc.path.length - 1] === "@id" && gc.value === object
          );
          if (idChild) return idChild.path.slice();
        }

        // Case C: predicate value is an array -> check elements
        if (Array.isArray(child.value)) {
          // iterate the element AST nodes
          for (const elemNode of child.children) {
            // element is primitive
            if (elemNode.value === object) return elemNode.path.slice();
            // element is object with @id (either elemNode.value["@id"] or its child)
            if (elemNode.value && typeof elemNode.value === "object") {
              if (elemNode.value["@id"] === object) return [...elemNode.path, "@id"];
              const idChild = elemNode.children.find(
                (gc) => gc.path[gc.path.length - 1] === "@id" && gc.value === object
              );
              if (idChild) return idChild.path.slice();
            }
          }
        }

        // nothing matched directly under this predicate node; continue searching deeper
      }

      // Recursively search deeper in the subtree
      const deeper = this.searchPredicateObject(child, predicate, object);
      if (deeper) return deeper;
    }

    return null;
  }

  // Use multiple subject nodes (because the same @id may appear multiple places)
  findTriplePath(
    subject: string,
    predicate: string,
    object: string
  ): (string | number)[] | null {
    const ast = this.buildAST(JSON.parse(this.text));
    const idIndex = this.indexById(ast);
    const subjectNodes = idIndex.get(subject);
    if (!subjectNodes) return null;
    for (const sn of subjectNodes) {
      const found = this.searchPredicateObject(sn, predicate, object);
      if (found) return found;
    }
    return null;
  }

}
