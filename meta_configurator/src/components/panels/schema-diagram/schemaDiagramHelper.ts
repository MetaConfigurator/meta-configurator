import type {Path} from '@/utility/path';
import type {Node} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import {pathToString} from '@/utility/pathUtils';
import {
  SchemaElementData,
  SchemaObjectNodeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';

export function findBestMatchingNode(nodes: Node[], selectedPath: Path): Node | undefined {
  const selectedPathString = pathToString(selectedPath);

  const matchingNode = nodes.find(
    node => pathToString(node.data.absolutePath) === selectedPathString
  );
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

  const selectedPathString = pathToString(selectedPath);

  if (selectedNode.data.getNodeType() === 'schemaobject') {
    const matchingAttribute = (selectedNode.data as SchemaObjectNodeData).attributes.find(
      attribute => pathToString(attribute.absolutePath) === selectedPathString
    );
    if (matchingAttribute) {
      return matchingAttribute;
    }
  }

  return selectedNode!.data;
}
