import {parseTree, findNodeAtLocation, modify, applyEdits, getNodeValue} from 'jsonc-parser';
import * as $rdf from 'rdflib';
import * as jsonld from 'jsonld';
import type {ParseError} from 'jsonc-parser';

export class JsonLdNodeManager {
  private tree: any = null;
  private text: string = '';
  private nodePositions: {[id: string]: {index: number; node: any}} = {};
  private context: Record<string, any> = {}; // extracted context

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
        this.nodePositions[idNode.value] = {index, node};
      }
    });
  }

  /** Convert offset → line/column */
  private offsetToLineCol(offset: number, length: number) {
    const before = this.text.slice(0, offset);
    const lines = before.split('\n');

    const start = {
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    };

    const endOffset = offset + length;
    const beforeEnd = this.text.slice(0, endOffset);
    const endLines = beforeEnd.split('\n');

    const end = {
      line: endLines.length,
      col: endLines[endLines.length - 1].length + 1,
    };

    return {start, end};
  }

  /** Given an AST node return its line/column range */
  getNodePosition(astNode: any) {
    if (!astNode) return null;
    return this.offsetToLineCol(astNode.offset, astNode.length);
  }

  /**
   * Find the AST paths for an RDF quad component:
   * subjectPath, predicatePath, objectPath
   */
  findPathsForQuad(quad: {subject: string; predicate: string; object: string}) {
    const graphNode = findNodeAtLocation(this.tree, ['@graph']);
    if (!graphNode || !graphNode.children) return null;

    for (let i = 0; i < graphNode.children.length; i++) {
      const nodeObj = graphNode.children[i];

      // Match subject
      const idNode = findNodeAtLocation(nodeObj, ['@id']);
      if (!idNode) continue;

      const idValue = getNodeValue(idNode);
      if (idValue !== quad.subject) continue;

      // Attempt to locate predicate
      const predicateNode = findNodeAtLocation(nodeObj, [quad.predicate]);

      let objectNode = null;
      if (predicateNode && predicateNode.type === 'array') {
        // Example: predicate: [ { "@value": "..."} ]
        objectNode = predicateNode.children?.[0];
      }

      return {
        subjectPath: ['@graph', i, '@id'],
        predicatePath: predicateNode ? ['@graph', i, quad.predicate] : null,
        objectPath: objectNode ? ['@graph', i, quad.predicate, 0] : null,
      };
    }

    return null;
  }

  /**
   * Return exact line/column for subject/predicate/object position.
   * field must be "subject" | "predicate" | "object".
   */
  getQuadFieldPosition(
    quad: {subject: string; predicate: string; object: string},
    field: 'subject' | 'predicate' | 'object'
  ) {
    const paths = this.findPathsForQuad(quad);
    if (!paths) return null;

    const path =
      field === 'subject'
        ? paths.subjectPath
        : field === 'predicate'
        ? paths.predicatePath
        : paths.objectPath;

    if (!path) return null;
    const node = findNodeAtLocation(this.tree, path);
    return this.getNodePosition(node);
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

    let jsonLdNodes = await jsonld.fromRDF(nquads, {format: 'application/n-quads'});
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
    const formattingOptions = {insertSpaces: true, tabSize: 2};

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
      formattingOptions: {insertSpaces: true, tabSize: 2},
    });

    this.text = applyEdits(this.text, edits);

    // Refresh AST + positions
    this.tree = parseTree(this.text);
    this.buildNodePositions();
  }

  getText() {
    return this.text;
  }

  getNode(subjectId: string) {
    return this.nodePositions[subjectId] || null;
  }
}
