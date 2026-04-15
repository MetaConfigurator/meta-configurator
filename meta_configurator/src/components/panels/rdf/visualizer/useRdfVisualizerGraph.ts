import {ref} from 'vue';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type * as $rdf from 'rdflib';
import {CY_LAYOUT, createCyStyle} from '@/components/panels/rdf/visualizer/rdfVisualizerGraphStyle';
import {buildGraphElements} from '@/components/panels/rdf/visualizer/rdfVisualizerGraphElements';

cytoscape.use(coseBilkent);

type NodeSelectHandler = (node: cytoscape.NodeSingular, nodeData: any) => void;

export function useRdfVisualizerGraph(options: {
  toPrefixed: (value: string) => string;
  isIRI: (value: string) => boolean;
  onNodeSelected: NodeSelectHandler;
  onCanvasTap: () => void;
  onEdgeTap: (predicateIri: string) => void;
}) {
  const container = ref<HTMLDivElement | null>(null);
  const cy = ref<cytoscape.Core | null>(null);
  const isLoading = ref(false);
  const graphLoaded = ref(false);
  const physicsEnabled = ref(false);

  function applyCyTheme() {
    if (!cy.value) return;
    cy.value.style(createCyStyle());
    cy.value.resize();
  }

  function exportGraphImage() {
    if (!cy.value) return;
    const dataUrl = cy.value.png({
      full: false,
      scale: 2,
    });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `rdf-graph-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.click();
  }

  function renderGraph(statements: readonly $rdf.Statement[]) {
    if (!container.value) return;

    isLoading.value = true;
    let didInitialFit = false;
    const elements = buildGraphElements(statements, options.toPrefixed, options.isIRI);

    const graph = setupCytoscape(elements);
    if (!graph) return;
    cy.value = graph;

    attachCytoscapeEvents(graph, () => {
      if (didInitialFit) return;
      didInitialFit = true;
      resizeAndFit(graph);
    });
  }

  function zoomIn() {
    animateZoom(1.2, true);
  }

  function zoomOut() {
    animateZoom(1 / 1.2, false);
  }

  function zoomFit() {
    if (!cy.value) return;
    animateFit(cy.value.elements(), 30, 400);
  }

  function zoomToSelected(selectedNode?: cytoscape.NodeSingular | null) {
    if (!cy.value) return;

    const node = selectedNode ?? cy.value.nodes(':selected').first();
    if (!node || node.length === 0) return;

    animateFit(node, 80, 400);
  }

  function focusNodeById(nodeId: string) {
    if (!cy.value) return;
    const node = cy.value.getElementById(nodeId);
    if (!node || node.length === 0) return;
    animateFit(node, 80, 400);
  }

  function selectNodeById(nodeId: string) {
    if (!cy.value) return;
    const node = cy.value.getElementById(nodeId);
    if (!node || node.length === 0) return;
    options.onNodeSelected(node, node.data());
    animateFit(node, 80, 400);
  }

  function togglePhysics() {
    if (!cy.value) return;

    physicsEnabled.value = !physicsEnabled.value;

    if (physicsEnabled.value) {
      const layout = buildPhysicsLayout();
      layout?.on('layoutstop', () => {
        physicsEnabled.value = false;
      });
      layout?.run();
    }
  }

  function startResizeObserver() {
    const observer = new ResizeObserver(() => {
      if (cy.value) {
        cy.value.resize();
        cy.value.fit(undefined, 30);
      }
    });
    if (container.value) {
      observer.observe(container.value);
    }
    return observer;
  }

  function destroyGraph() {
    if (cy.value) {
      cy.value.destroy();
      cy.value = null;
    }
  }

  function setupCytoscape(elements: cytoscape.ElementDefinition[]) {
    if (!container.value) return null;

    if (cy.value) {
      cy.value.destroy();
    }

    return cytoscape({
      container: container.value,
      elements,
      style: createCyStyle(),
      layout: CY_LAYOUT,
    });
  }

  function attachCytoscapeEvents(graph: cytoscape.Core, initialFit: () => void) {
    enableGraphInteractions(graph);
    registerLayoutStop(graph, initialFit);
    registerNodeTap(graph);
    registerNodeDoubleTap(graph);
    registerCanvasTap(graph);
    registerEdgeTap(graph);
    registerEdgeHover(graph);
  }

  function animateZoom(factor: number, centerOnSelected: boolean) {
    if (!cy.value) return;
    cy.value.stop(true);
    const currentZoom = cy.value.zoom();
    const animationConfig: any = {
      zoom: currentZoom * factor,
      duration: 300,
      easing: 'ease-in-out-cubic',
    };
    if (centerOnSelected) {
      const selectedNodes = cy.value.nodes(':selected');
      if (selectedNodes.length > 0) {
        animationConfig.center = {eles: selectedNodes};
      }
    }
    cy.value.animate(animationConfig);
  }

  function animateFit(eles: cytoscape.Collection, padding: number, duration: number) {
    if (!cy.value) return;
    cy.value.animate({
      fit: {
        eles,
        padding,
      },
      duration,
      easing: 'ease-in-out-cubic',
    });
  }

  function buildPhysicsLayout() {
    if (!cy.value) return;
    const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);
    return cy.value.layout({
      name: 'cose-bilkent',
      animate: true,
      animationDuration: 1000,
      randomize: true,
      idealEdgeLength: randomInRange(160, 280),
      edgeElasticity: randomInRange(70, 140),
      gravity: randomInRange(70, 130),
      numIter: 15000,
    });
  }

  function enableGraphInteractions(graph: cytoscape.Core) {
    graph.userPanningEnabled(true);
    graph.userZoomingEnabled(true);
    graph.boxSelectionEnabled(true);
  }

  function registerLayoutStop(graph: cytoscape.Core, initialFit: () => void) {
    graph.on('layoutstop', () => {
      isLoading.value = false;
      graphLoaded.value = true;
      initialFit();
    });
  }

  function registerNodeTap(graph: cytoscape.Core) {
    graph.on('tap', 'node', event => {
      const node = event.target;
      const nodeData = node.data();
      pulseNode(node);
      options.onNodeSelected(node, nodeData);
    });
  }

  function registerNodeDoubleTap(graph: cytoscape.Core) {
    graph.on('dblclick', 'node', event => {
      const node = event.target;
      const nodeData = node.data();
      options.onNodeSelected(node, nodeData);
      zoomToSelected(node);
    });
  }

  function registerCanvasTap(graph: cytoscape.Core) {
    graph.on('tap', event => {
      if (event.target === graph) {
        options.onCanvasTap();
      }
    });
  }

  function registerEdgeTap(graph: cytoscape.Core) {
    graph.on('tap', 'edge', event => {
      const edge = event.target;
      const predicateIRI = edge.data('predicateIRI');
      pulseEdge(edge);
      options.onEdgeTap(predicateIRI);
    });
  }

  function registerEdgeHover(graph: cytoscape.Core) {
    graph.on('mouseover', 'edge', () => {
      if (container.value) {
        container.value.style.cursor = 'pointer';
      }
    });
    graph.on('mouseout', 'edge', () => {
      if (container.value) {
        container.value.style.cursor = 'default';
      }
    });
  }

  function pulseNode(node: cytoscape.NodeSingular) {
    node.animate({
      style: {'border-width': 6},
      duration: 200,
      complete: function () {
        node.animate({
          style: {'border-width': 4},
          duration: 200,
        });
      },
    });
  }

  function pulseEdge(edge: cytoscape.EdgeSingular) {
    edge.animate({
      style: {width: 5},
      duration: 200,
      complete: function () {
        edge.animate({
          style: {width: 2},
          duration: 200,
        });
      },
    });
  }

  function resizeAndFit(graph: cytoscape.Core) {
    graph.resize();
    graph.fit(undefined, 30);
  }

  return {
    container,
    cy,
    isLoading,
    graphLoaded,
    physicsEnabled,
    applyCyTheme,
    exportGraphImage,
    renderGraph,
    zoomIn,
    zoomOut,
    zoomFit,
    zoomToSelected,
    selectNodeById,
    togglePhysics,
    focusNodeById,
    startResizeObserver,
    destroyGraph,
  };
}
