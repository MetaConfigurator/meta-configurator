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

export function findBestMatchingNodeData(
  nodesData: SchemaNodeData[],
  selectedPath: Path
): SchemaElementData | undefined {
  const matchingNode = nodesData.find(node => arePathsEqual(node.absolutePath, selectedPath));
  if (matchingNode) {
    return matchingNode;
  }

  if (selectedPath.length > 0) {
    return findBestMatchingNodeData(nodesData, selectedPath.slice(0, -1));
  }

  return undefined;
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
  selectedNodeData: SchemaElementData | undefined,
  selectedPath: Path
): SchemaElementData | undefined {
  if (!selectedNodeData) {
    return undefined;
  }

  if (selectedNodeData.getNodeType() === 'schemaobject') {
    const matchingAttribute = (selectedNodeData as SchemaObjectNodeData).attributes.find(
      attribute => arePathsEqual(attribute.absolutePath, selectedPath)
    );
    if (matchingAttribute) {
      return matchingAttribute;
    }

    if (selectedPath.length > 0) {
      return findBestMatchingData(selectedNodeData, selectedPath.slice(0, -1));
    }
  }

  return selectedNodeData;
}

export function hasOutgoingEdge(node: SchemaNodeData, graph: SchemaGraph): boolean {
  return graph.edges.some(edge => {
    return pathToString(edge.startSchemaPath) == pathToString(node.absolutePath);
  });
}
