import {parseTree, findNodeAtLocation, modify, applyEdits, getNodeValue} from 'jsonc-parser';
import * as $rdf from 'rdflib';
import * as jsonld from 'jsonld';
import type {ParseError} from 'jsonc-parser';

export class JsonLdNodeManager {
  private tree: any = null;
  private text: string = '';
  private nodePositions: {[id: string]: {index: number; node: any}} = {};

  constructor(jsonLdText: string) {
    this.text = jsonLdText;
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

  /** Get node position info by @id */
  getNode(subjectId: string) {
    return this.nodePositions[subjectId] || null;
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

  /** Rebuild node content using RDF store */
  async rebuildNode(subjectId: string, store: $rdf.IndexedFormula) {
    const triples = store.statements.filter(st => st.subject.value === subjectId);
    if (!triples.length) return;

    const nquads = triples
      .map(st => `${st.subject.toNT()} ${st.predicate.toNT()} ${st.object.toNT()} .`)
      .join('\n');

    const jsonLdNodes = await jsonld.fromRDF(nquads, {format: 'application/n-quads'});
    const updatedNode = jsonLdNodes[0];

    this.replaceNode(subjectId, updatedNode);
  }

  /** Replace full node object */
  replaceNode(subjectId: string, newNode: any) {
    const nodeInfo = this.nodePositions[subjectId];
    if (!nodeInfo) throw new Error(`Subject ${subjectId} not found in JSON-LD`);

    const edits = modify(this.text, ['@graph', nodeInfo.index], newNode, {
      formattingOptions: {insertSpaces: true, tabSize: 2},
    });

    this.text = applyEdits(this.text, edits);

    // Refresh AST + node positions
    this.tree = parseTree(this.text);
    this.buildNodePositions();
  }

  getText() {
    return this.text;
  }
}
