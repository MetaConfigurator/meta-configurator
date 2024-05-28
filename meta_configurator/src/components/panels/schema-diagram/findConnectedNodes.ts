import {type Edge, type Node} from '@/components/panels/schema-diagram/schemaDiagramTypes';

export function findForwardConnectedNodesAndEdges(
  allNodes: Node[],
  allEdges: Edge[],
  node: Node
): [Node[], Edge[]] {
  const connectedNodes: Node[] = [];
  const connectedEdges: Edge[] = [];
  const visitedNodes = new Set<Node>();

  visitNode(node, visitedNodes, connectedNodes, connectedEdges, allNodes, allEdges);

  return [connectedNodes, connectedEdges];
}

function visitNode(
  node: Node,
  visitedNodes: Set<Node>,
  connectedNodes: Node[],
  connectedEdges: Edge[],
  allNodes: Node[],
  allEdges: Edge[]
) {
  if (visitedNodes.has(node)) {
    return;
  }
  visitedNodes.add(node);
  connectedNodes.push(node);

  allEdges.forEach(edge => {
    if (edge.data.start.absolutePath === node.data.absolutePath) {
      if (connectedEdges.includes(edge)) {
        return;
      }

      // edge is outgoing from current Node
      connectedEdges.push(edge);

      const endNode = allNodes.find(n => n.data.absolutePath === edge.data.end.absolutePath);
      if (endNode) {
        // target node found
        visitNode(endNode, visitedNodes, connectedNodes, connectedEdges, allNodes, allEdges);
      }
    }
  });
}
