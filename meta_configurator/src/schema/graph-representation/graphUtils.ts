import type {Path} from '@/utility/path';
import {arePathsEqual, pathToString} from '@/utility/pathUtils';
import {
  type Node,
  SchemaElementData,
  SchemaGraph,
  SchemaNodeData,
  type SchemaObjectNodeData,
} from '@/schema/graph-representation/schemaGraphTypes';

export function pathsToEdgeId(start: Path, end: Path, label: string, isArray: boolean): string {
  return (
    pathToNodeId(start) + '--[' + label + (isArray ? '_array' : '') + ']-->' + pathToNodeId(end)
  );
}

export function pathToNodeId(path: Path): string {
  if (path.length == 0) {
    return 'root';
  } else {
    return pathToString(path);
  }
}

export function findBestMatchingNode(nodes: Node[], selectedPath: Path): Node | undefined {
  const matchingNode = nodes.find(node => arePathsEqual(node.data.absolutePath, selectedPath));
  if (matchingNode) {
    return matchingNode;
  }

  if (selectedPath.length > 0) {
    return findBestMatchingNode(nodes, selectedPath.slice(0, -1));
  }

  return undefined;
}

export function findBestMatchingData(
  selectedNode: Node | undefined,
  selectedPath: Path
): SchemaElementData | undefined {
  if (!selectedNode) {
    return undefined;
  }

  if (selectedNode.data.getNodeType() === 'schemaobject') {
    const matchingAttribute = (selectedNode.data as SchemaObjectNodeData).attributes.find(
      attribute => arePathsEqual(attribute.absolutePath, selectedPath)
    );
    if (matchingAttribute) {
      return matchingAttribute;
    }

    if (selectedPath.length > 0) {
      return findBestMatchingData(selectedNode, selectedPath.slice(0, -1));
    }
  }

  return selectedNode!.data;
}

export function hasOutgoingEdge(node: SchemaNodeData, graph: SchemaGraph): boolean {
  return graph.edges.some(edge => {
    return pathToString(edge.startSchemaPath) == pathToString(node.absolutePath);
  });
}
