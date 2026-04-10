import type cytoscape from 'cytoscape';

export const TYPE_PREDICATES = [
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  'https://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  'rdf:type',
  '@type',
];

export function isTypePredicate(predicate: string): boolean {
  return (
    TYPE_PREDICATES.includes(predicate) ||
    predicate.endsWith('#type') ||
    predicate.endsWith('/type')
  );
}

export function createCyStyle(isDarkMode: boolean): cytoscape.StylesheetCSS[] {
  const edgeLabelColor = isDarkMode ? '#f8fafc' : '#111827';
  return [
    {
      selector: 'node',
      css: {
        'background-color': '#4299e1',
        'border-width': '2',
        'border-color': '#2c5282',
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'min-width': '60',
        'min-height': '30',
        color: '#fff',
        'font-size': '12px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        width: (node: any) => {
          return node.data('label').length * 7;
        },
        height: '30',
        padding: '15px',
        shape: 'roundrectangle',
        'transition-property': 'background-color, border-color, border-width',
        'transition-duration': 300,
      },
    },
    {
      selector: 'node.selected',
      css: {
        'background-color': '#22c55e',
        'border-width': '4',
        'border-color': '#15803d',
      },
    },
    {
      selector: 'node[hasLiterals]',
      css: {
        'border-color': '#f6ad55',
        'border-width': '3',
      },
    },
    {
      selector: 'edge',
      css: {
        width: '2',
        'line-color': '#a0aec0',
        'target-arrow-color': '#a0aec0',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'control-point-step-size': 100,
        label: 'data(label)',
        color: edgeLabelColor,
        'font-size': '12px',
        'text-rotation': 'autorotate',
        'text-background-opacity': 0,
        'text-margin-y': -12,
        'transition-property': 'line-color, width',
        'transition-duration': 300,
      },
    },
  ];
}

export const CY_LAYOUT = {
  name: 'cose-bilkent',
  animate: true,
  animationDuration: 500,
  animationEasing: 'ease-in-out-cubic',
  randomize: true,
  idealEdgeLength: 220,
  nodeRepulsion: 9000,
  edgeElasticity: 100,
  gravity: 80,
  numIter: 1000000,
  tile: true,
  tilingPaddingVertical: 10,
  tilingPaddingHorizontal: 10,
  nodeDimensionsIncludeLabels: false,
  avoidOverlap: true,
  avoidOverlapPadding: 50,
} as any;
