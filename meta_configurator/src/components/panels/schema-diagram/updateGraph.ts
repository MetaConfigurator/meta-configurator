import {type Node} from '@/components/panels/schema-diagram/schemaDiagramTypes';

// updates the data of the old nodes with the data of the new nodes and returns the ids of the nodes to be removed
export function updateNodeData(oldNodes: Node[], newNodes: Node[]): string[] {
  for (const newNode of newNodes) {
    const oldNode = oldNodes.find(node => node.id === newNode.id);
    if (oldNode) {
      oldNode.data = newNode.data;
    }
  }

  return oldNodes
    .filter(node => !newNodes.find(newNode => newNode.id === node.id))
    .map(node => node.id);
}

export function wasNodeAdded(oldNodes: Node[], newNodes: Node[]): boolean {
  for (const newNode of newNodes) {
    if (!oldNodes.find(node => node.id === newNode.id)) {
      return true;
    }
  }
  return false;
}
