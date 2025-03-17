import {MarkerType} from '@vue-flow/core';
import {pathsToEdgeId, pathToNodeId} from '@/schema/graph-representation/graphUtils';
import {isDarkMode} from '@/utility/darkModeUtils';
import {
  EdgeType,
  type Node,
  type Edge,
  SchemaGraph
} from "@/schema/graph-representation/schemaGraphTypes";

export class VueFlowGraph {
  public constructor(public nodes: Node[], public edges: Edge[]) {}
}


  export function schemaGraphToVueFlowNodes(graph: SchemaGraph): Node[] {
    return graph.nodes.map(data => {
      return {
        id: pathToNodeId(data.absolutePath),
        position: {x: Math.random() * 500, y: Math.random() * 500},
        label: data.name,
        type: data.getNodeType(),
        data: data,
      };
    });
  }

  export function schemaGraphToVueFlowEdges(graph: SchemaGraph, individualAttributeHandles: boolean): Edge[] {
    return graph.edges.map(data => {
      let type = 'default';
      let color = isDarkMode.value ? 'white' : 'black';
      const markerEnd = MarkerType.Arrow;
      const sourceHandle = individualAttributeHandles ? data.startHandle : null;
      const label = data.isArray ? data.label + '[]' : data.label;

      switch (data.edgeType) {
        case EdgeType.ATTRIBUTE:
          break;
        case EdgeType.ALL_OF:
          color = 'seagreen';
          break;
        case EdgeType.ANY_OF:
          color = 'seagreen';
          break;
        case EdgeType.ONE_OF:
          color = 'seagreen';
          break;
        case EdgeType.IF:
          type = 'straight';
          color = 'indianred';
          break;
        case EdgeType.THEN:
          type = 'straight';
          color = 'indianred';
          break;
        case EdgeType.ELSE:
          type = 'straight';
          color = 'indianred';
          break;
      }

      return {
        id: pathsToEdgeId(data.start.absolutePath, data.end.absolutePath, data.label, data.isArray),
        source: pathToNodeId(data.start.absolutePath),
        target: pathToNodeId(data.end.absolutePath),
        sourceHandle: sourceHandle ? sourceHandle : 'main',
        type: type,
        label: label,
        data: data,
        markerEnd: markerEnd,
        animated: false,
        style: {stroke: color, 'stroke-width': 1.5},
      };
    });
  }

  export function schemaGraphToVueFlowGraph(graph: SchemaGraph, individualAttributeEdges: boolean): VueFlowGraph {
    const nodes = schemaGraphToVueFlowNodes(graph);
    const edges = schemaGraphToVueFlowEdges(graph, individualAttributeEdges);
    return new VueFlowGraph(nodes, edges);
  }

