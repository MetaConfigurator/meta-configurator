import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Path} from '@/utility/path';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {
  EdgeType,
  SchemaEnumNodeData,
  SchemaGraph,
  SchemaObjectNodeData,
} from '../schemaDiagramTypes';
import {
  generateAttributeEdges,
  generateObjectAttributes,
  identifyObjects,
  populateGraph,
  trimGraph,
  trimNodeChildren,
} from '../schemaGraphConstructor';
import {useSettings} from '@/settings/useSettings';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
  useSettings() {
    return {
      schemaDiagram: {
        showEnumValues: true,
        maxEnumValuesToShow: 5,
        showAttributes: true,
        maxAttributesToShow: 5,
      },
    };
  },
}));

describe('test schema graph constructor with objects and attributes with enums', () => {
  let currentPath: Path;
  let schema: TopLevelSchema = {
    type: 'object',
    $defs: {
      enumString: {
        type: 'string',
        enum: ['value1', 'value2'],
      },
      enumInt: {
        type: 'integer',
        enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      },
    },
    properties: {
      propertyEnum: {
        type: 'string',
        enum: ['valueA', 'valueC'],
      },
      propertyEnumRef1: {
        $ref: '#/$defs/enumString',
      },
      propertyEnumRef2: {
        $ref: '#/$defs/enumInt',
      },
    },
  };

  let defs: Map<string, SchemaObjectNodeData>;

  beforeEach(() => {
    currentPath = [];
    defs = new Map();
    identifyObjects(currentPath, schema, defs);
    // @ts-ignore
    for (const [key, value] of Object.entries(schema.$defs)) {
      identifyObjects(['$defs', key], value, defs);
    }
  });

  it('identify objects', () => {
    expect(defs.size).toEqual(6);
    expect(defs.has('')).toBeTruthy();
    expect(defs.has('$defs.enumString')).toBeTruthy();
    expect(defs.has('$defs.enumInt')).toBeTruthy();
    expect(defs.has('properties.propertyEnum')).toBeTruthy();
    expect(defs.has('properties.propertyEnumRef1')).toBeTruthy();
    expect(defs.has('properties.propertyEnumRef2')).toBeTruthy();
  });

  it('generate object attributes', () => {
    const rootNode = defs.get('')!;
    expect(rootNode).toBeDefined();
    rootNode.attributes = generateObjectAttributes(rootNode.absolutePath, rootNode.schema, defs);

    expect(rootNode.attributes.length).toEqual(3);
    expect(rootNode.attributes[0].name).toEqual('propertyEnum');
    expect(rootNode.attributes[0].absolutePath).toEqual(['properties', 'propertyEnum']);

    expect(rootNode.attributes[1].name).toEqual('propertyEnumRef1');
    expect(rootNode.attributes[1].absolutePath).toEqual(['properties', 'propertyEnumRef1']);

    expect(rootNode.attributes[2].name).toEqual('propertyEnumRef2');
    expect(rootNode.attributes[2].absolutePath).toEqual(['properties', 'propertyEnumRef2']);
  });

  it('generate attribute edges', () => {
    for (const node of defs.values()) {
      node.attributes = generateObjectAttributes(node.absolutePath, node.schema, defs);
    }

    const graph = new SchemaGraph([], []);

    const rootNode = defs.get('')!;
    generateAttributeEdges(rootNode, defs, graph);
    expect(graph.edges.length).toEqual(3);
    for (const edge of graph.edges) {
      expect(edge.start.absolutePath).toEqual([]);
    }
    expect(graph.edges[0].end.absolutePath).toEqual(['properties', 'propertyEnum']);
    expect(graph.edges[0].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[0].label).toEqual('propertyEnum');
    expect(graph.edges[0].end.getNodeType() == 'schemaenum').toBeTruthy();

    expect(graph.edges[1].end.absolutePath).toEqual(['$defs', 'enumString']);
    expect(graph.edges[1].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[1].label).toEqual('propertyEnumRef1');
    expect(graph.edges[1].end.getNodeType() == 'schemaenum').toBeTruthy();

    expect(graph.edges[2].end.absolutePath).toEqual(['$defs', 'enumInt']);
    expect(graph.edges[2].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[2].label).toEqual('propertyEnumRef2');
    expect(graph.edges[2].end.getNodeType() == 'schemaenum').toBeTruthy();
  });

  it('trim enum values', () => {
    const schemaGraph = new SchemaGraph([], []);
    populateGraph(defs, schemaGraph);

    // @ts-ignore
    const enumIntNode: SchemaEnumNodeData = defs.get('$defs.enumInt')! as SchemaEnumNodeData;

    expect(enumIntNode.values.length).toEqual(10);

    trimNodeChildren(schemaGraph);

    expect(enumIntNode.values.length).toEqual(useSettings().schemaDiagram.maxEnumValuesToShow);
  });
});
