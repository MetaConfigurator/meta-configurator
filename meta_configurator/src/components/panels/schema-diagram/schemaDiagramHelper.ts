import type {Path} from '@/utility/path';
import type {Node} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import {pathToString} from '@/utility/pathUtils';
import {
  SchemaElementData,
  SchemaObjectNodeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';

export function identifyBestMatchingNode(nodes: Node[], path: Path): Node | undefined {
  const pathString = pathToString(path);

  let bestMatchNode: Node | undefined = undefined;

  for (const node of nodes) {
    const nodePath = node.data.absolutePath;
    const nodePathString = pathToString(nodePath);
    // is match at all
    if (pathString.startsWith(nodePathString)) {
      // is better match than previous
      if (!bestMatchNode || nodePath.length > bestMatchNode.data.absolutePath.length) {
        bestMatchNode = node;
      }
    }
  }

  return bestMatchNode;
}

export function identifyBestMatchingData(
  selectedNode: Node | undefined,
  path: Path
): SchemaElementData | undefined {
  if (!selectedNode) {
    return undefined;
  }

  const pathString = pathToString(path);

  let bestMatch: SchemaElementData = selectedNode.data;

  if (selectedNode!.data.getNodeType() === 'schemaobject') {
    const objectNode = selectedNode.data as SchemaObjectNodeData;
    for (const attribute of objectNode.attributes) {
      const attributePath = attribute.absolutePath;
      const attributePathString = pathToString(attributePath);
      // is match at all
      if (pathString.startsWith(attributePathString)) {
        // is better match than previous
        if (!bestMatch || attributePath.length > bestMatch.absolutePath.length) {
          bestMatch = attribute;
        }
      }
    }
  }

  return bestMatch;
}
