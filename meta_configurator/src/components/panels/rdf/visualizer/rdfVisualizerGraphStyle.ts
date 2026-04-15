import type cytoscape from 'cytoscape';
import {isDark} from '@/components/panels/rdf/rdfUtils';

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

function getCssVar(variable: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

export function createCyStyle(): cytoscape.StylesheetCSS[] {
  const isDarkMode = isDark();
  const nodeBg = getCssVar('--p-blue-400');
  const nodeBorder = getCssVar('--p-blue-700');
  const nodeText = getCssVar('--p-text-color');
  const nodeSelectedBg = getCssVar('--p-green-500');
  const nodeSelectedBorder = getCssVar('--p-green-700');
  const nodeLiteralBorder = getCssVar('--p-orange-300');
  const edgeColor = getCssVar('--p-surface-400');
  const edgeLabelColor = isDarkMode.value
    ? getCssVar('--p-surface-0')
    : getCssVar('--p-surface-900');

  return [
    {
      selector: 'node',
      css: {
        'background-color': nodeBg,
        'border-width': '2',
        'border-color': nodeBorder,
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'min-width': '60',
        'min-height': '30',
        color: nodeText,
        'font-size': '12px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        width: (node: any) => node.data('label').length * 7,
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
        'background-color': nodeSelectedBg,
        'border-width': '4',
        'border-color': nodeSelectedBorder,
      },
    },
    {
      selector: 'node[hasLiterals]',
      css: {
        'border-color': nodeLiteralBorder,
        'border-width': '3',
      },
    },
    {
      selector: 'edge',
      css: {
        width: '2',
        'line-color': edgeColor,
        'target-arrow-color': edgeColor,
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
