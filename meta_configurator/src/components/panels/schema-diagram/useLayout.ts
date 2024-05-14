import dagre from 'dagrejs';
import {Position, useVueFlow} from '@vue-flow/core';
import {ref} from 'vue';
import type {Edge, Node} from '@/components/panels/schema-diagram/schemaDiagramTypes';

// Taken and adapted from https://vueflow.dev/examples/layout.html

/**
 * Composable to run the layout algorithm on the graph.
 * It uses the `dagre` library to calculate the layout of the nodes and edges.
 */
export function useLayout() {
  const {findNode} = useVueFlow();

  const graph = ref(new dagre.graphlib.Graph());

  function layout(nodes: Node[], edges: Edge[], direction: string): Node[] {
    // we create a new graph instance, in case some nodes/edges were removed, otherwise dagre would act as if they were still there
    const dagreGraph = new dagre.graphlib.Graph();

    graph.value = dagreGraph;

    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({rankdir: direction});

    for (const node of nodes) {
      const graphNode = findNode(node.id)!;
      dagreGraph.setNode(node.id, {
        width: graphNode.dimensions.width,
        height: graphNode.dimensions.height,
      });
    }

    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target);
    }

    dagre.layout(dagreGraph);

    // set nodes with updated positions
    return nodes.map(node => {
      const nodeWithPosition = dagreGraph.node(node.id);

      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: {x: nodeWithPosition.x, y: nodeWithPosition.y},
      };
    });
  }

  return {graph, layout};
}
