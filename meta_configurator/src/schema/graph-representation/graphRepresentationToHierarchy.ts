import {
  EdgeType,
  SchemaElementData,
  type SchemaGraph,
  SchemaNodeData,
  SchemaObjectNodeData,
} from '@/schema/graph-representation/schemaGraphTypes';
import {pathToString} from '@/utility/pathUtils';

export interface HierarchyNode {
  graphNode: SchemaNodeData;
  children: HierarchyNode[];
  parent?: HierarchyNode;
  depth: number;
}

export function graphRepresentationToHierarchy(
  graph: SchemaGraph,
  noConditionalSubschemas: boolean
): HierarchyNode {
  const graphRootNode = graph.findNode([]);
  const hierarchyRootNode: HierarchyNode = {
    graphNode: graphRootNode!,
    children: [],
    parent: undefined,
    depth: 0,
  };
  hierarchyRootNode.children = findHierarchyNodeChildren(
    hierarchyRootNode,
    graph,
    noConditionalSubschemas,
    new Set<SchemaElementData>()
  );
  return hierarchyRootNode;
}

function findHierarchyNodeChildren(
  node: HierarchyNode,
  graph: SchemaGraph,
  noSpecialSubSchemas: boolean,
  alreadyVisitedNodes: Set<SchemaElementData>
): HierarchyNode[] {
  const children: HierarchyNode[] = [];

  for (const edge of graph.edges) {
    if (pathToString(edge.start.absolutePath) === pathToString(node.graphNode.absolutePath)) {
      const targetNode = graph.findNode(edge.end.absolutePath);

      if (targetNode) {
        if (noSpecialSubSchemas) {
          if ([EdgeType.IF, EdgeType.ELSE, EdgeType.THEN].includes(edge.edgeType)) {
            // skip edges that are not attributes, pattern properties or additional properties
            continue;
          }
        }

        if (alreadyVisitedNodes.has(targetNode)) {
          // to break cyclic dependencies, we stop traversing this branch
          break;
        } else {
          alreadyVisitedNodes.add(targetNode);
        }

        const childNode: HierarchyNode = {
          graphNode: targetNode,
          children: [],
          parent: node,
          depth: node.depth + 1,
        };
        childNode.children = findHierarchyNodeChildren(
          childNode,
          graph,
          noSpecialSubSchemas,
          new Set(alreadyVisitedNodes)
        );
        children.push(childNode);
      }
    }
  }

  return children;
}

export function flattenHierarchy(rootNode: HierarchyNode): HierarchyNode[] {
  const flatList: HierarchyNode[] = [];

  function traverse(node: HierarchyNode) {
    flatList.push(node);
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(rootNode);
  return flatList;
}
