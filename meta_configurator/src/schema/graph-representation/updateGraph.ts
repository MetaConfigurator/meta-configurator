import {type Node, SchemaObjectNodeData} from '@/schema/graph-representation/schemaGraphTypes';
import {isSimpleType} from '@/schema/graph-representation/typeUtils';

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

export function wasNodeAddedOrEdgesChanged(oldNodes: Node[], newNodes: Node[]): boolean {
  for (const newNode of newNodes) {
    const oldNode = oldNodes.find(node => node.id === newNode.id);
    if (!oldNode) {
      return true;
    }
    if (oldNode.data.getNodeType() !== newNode.data.getNodeType()) {
      // if new node somehow is of a different type: also update
      return true;
    }
    if (oldNode.data.getNodeType() === 'schemaobject') {
      // if it is a schema object node, we need to check if the attributes have changed in a way that changes the edges
      const newAttributes = (newNode.data as SchemaObjectNodeData).attributes;
      const oldAttributes = (oldNode.data as SchemaObjectNodeData).attributes;
      if (newAttributes.length !== oldAttributes.length) {
        return true;
      }
      // edges changed only if an attribute type changed and the new or old value was a schema object instead of a simple type
      for (let i = 0; i < newAttributes.length; i++) {
        if (newAttributes[i].typeDescription !== oldAttributes[i].typeDescription) {
          if (
            !isSimpleType(newAttributes[i].typeDescription) ||
            !isSimpleType(oldAttributes[i].typeDescription)
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}
