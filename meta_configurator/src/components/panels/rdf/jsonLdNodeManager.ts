import {parseTree, findNodeAtLocation, modify, applyEdits} from 'jsonc-parser';
import * as $rdf from 'rdflib';
import * as jsonld from 'jsonld';

export class JsonLdNodeManager {
  private tree: any = null;
  private text: string = '';
  private nodePositions: {[id: string]: {index: number; node: any}} = {};

  constructor(jsonLdText: string) {
    this.text = jsonLdText;
    this.tree = parseTree(this.text);
    this.buildNodePositions();
  }

  /** Build mapping: @id -> node AST and index in @graph */
  private buildNodePositions() {
    // Clear previous mapping
    Object.keys(this.nodePositions).forEach(k => delete this.nodePositions[k]);

    const graphNode = findNodeAtLocation(this.tree, ['@graph']);
    if (!graphNode || graphNode.type !== 'array') return;

    graphNode.children?.forEach((node, index) => {
      const idNode = findNodeAtLocation(node, ['@id']);
      if (idNode && idNode.value) {
        this.nodePositions[idNode.value] = {index, node};
      }
    });
  }

  /** Get node position info by subject (@id) */
  getNode(subjectId: string) {
    return this.nodePositions[subjectId] || null;
  }

  async rebuildNode(subjectId: string, store: $rdf.IndexedFormula) {
    // Extract triples for this node
    const triples = store.statements.filter(st => st.subject.value === subjectId);
    if (!triples.length) return;

    // Convert triples to N-Quads
    const nquads = triples
      .map(st => `${st.subject.toNT()} ${st.predicate.toNT()} ${st.object.toNT()} .`)
      .join('\n');

    // Convert N-Quads to JSON-LD node
    const jsonLdNodeArray = await jsonld.fromRDF(nquads, {format: 'application/n-quads'});
    const updatedNode = jsonLdNodeArray[0];

    // Replace node in AST/text
    this.replaceNode(subjectId, updatedNode);
  }

  /** Replace node contents for a given subject with newNode object */
  replaceNode(subjectId: string, newNode: any) {
    const nodeInfo = this.nodePositions[subjectId];
    if (!nodeInfo) throw new Error(`Subject ${subjectId} not found`);

    const edits = modify(this.text, ['@graph', nodeInfo.index], newNode, {
      formattingOptions: {insertSpaces: true, tabSize: 2},
    });

    this.text = applyEdits(this.text, edits);

    // Update AST and nodePositions after replacement
    this.tree = parseTree(this.text);
    this.buildNodePositions();
  }

  /** Get updated JSON-LD text */
  getText() {
    return this.text;
  }
}
