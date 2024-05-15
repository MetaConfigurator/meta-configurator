import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Path} from '@/utility/path';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {EdgeType, SchemaGraph, SchemaObjectNodeData} from '../schemaDiagramTypes';
import {
  generateObjectAttributes,
  generateObjectSpecialPropertyEdges,
  generateObjectTitle,
  identifyObjects,
  isObjectSchema,
  populateGraph,
  trimGraph,
} from '../schemaGraphConstructor';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('test schema graph constructor with conditionals', () => {
  let currentPath: Path;
  let schema: TopLevelSchema = {
    type: 'object',
    required: ['propertyObject'],
    $defs: {
      researcher: {
        required: ['researchField'],
        type: 'object',
        properties: {
          researchField: {type: 'string'},
        },
      },
    },
    properties: {
      propertySimple: {
        type: 'string',
      },
      propertyObject: {
        type: 'object',
        properties: {
          someNumber: {type: 'number'},
        },
      },
    },
    if: {
      $ref: '#/$defs/researcher',
    },
    then: {
      // note that the 'then' is not explicitly marked as type object, but the functions can still resolve it properly
      properties: {
        propertyObject: {
          properties: {
            someNumber: {
              type: 'number',
              multipleOf: 42,
            },
          },
        },
      },
    },
    else: true,
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
    expect(defs.size).toEqual(10);
    expect(defs.has('')).toBeTruthy();
    expect(defs.has('$defs.researcher')).toBeTruthy();
    expect(defs.has('$defs.researcher.properties.researchField')).toBeTruthy();
    expect(defs.has('properties.propertySimple')).toBeTruthy();
    expect(defs.has('properties.propertyObject')).toBeTruthy();
    expect(defs.has('properties.propertyObject.properties.someNumber')).toBeTruthy();
    expect(defs.has('if')).toBeTruthy();
    expect(defs.has('then')).toBeTruthy();
    expect(defs.has('then.properties.propertyObject')).toBeTruthy();
    expect(defs.has('then.properties.propertyObject.properties.someNumber')).toBeTruthy();
    // falsy because there is no object behind it (it is a boolean schema)
    expect(defs.has('else')).toBeFalsy();
  });

  it('generate object attributes', () => {
    const rootNode = defs.get('')!;
    expect(rootNode).toBeDefined();
    rootNode.attributes = generateObjectAttributes(rootNode.absolutePath, rootNode.schema, defs);

    expect(rootNode.attributes.length).toEqual(2);
    expect(rootNode.attributes[0].name).toEqual('propertySimple');
    expect(rootNode.attributes[0].absolutePath).toEqual(['properties', 'propertySimple']);

    expect(rootNode.attributes[1].name).toEqual('propertyObject');
    expect(rootNode.attributes[1].absolutePath).toEqual(['properties', 'propertyObject']);
  });

  it('deal with "then" that only implicitly has object type', () => {
    const thenNode = defs.get('then')!;
    expect(thenNode).toBeDefined();
    thenNode.attributes = generateObjectAttributes(thenNode.absolutePath, thenNode.schema, defs);

    expect(thenNode.attributes.length).toEqual(1);
    expect(thenNode.attributes[0].name).toEqual('propertyObject');
    expect(thenNode.attributes[0].absolutePath).toEqual(['then', 'properties', 'propertyObject']);
  });

  it('generate object title', () => {
    // filter defs for nodes that have schema.type 'object'
    const objectNodeCount = Array.from(defs.values()).filter(node =>
      isObjectSchema(node.schema)
    ).length;
    expect(objectNodeCount).toEqual(5);

    // We care about titles of nodes that define objects only
    const rootNode = defs.get('')!;
    expect(generateObjectTitle(rootNode.absolutePath, rootNode.schema)).toEqual('root');

    const propComplex = defs.get('properties.propertyObject')!;
    expect(generateObjectTitle(propComplex.absolutePath, propComplex.schema)).toEqual(
      'propertyObject'
    );

    const researcher = defs.get('$defs.researcher')!;
    expect(generateObjectTitle(researcher.absolutePath, researcher.schema)).toEqual('researcher');

    const thenNode = defs.get('then')!;
    expect(generateObjectTitle(thenNode.absolutePath, thenNode.schema)).toEqual('then');

    const thenNodeObject = defs.get('then.properties.propertyObject')!;
    expect(generateObjectTitle(thenNodeObject.absolutePath, thenNodeObject.schema)).toEqual(
      'propertyObject'
    );
  });

  it('generate special property edges', () => {
    for (const node of defs.values()) {
      node.attributes = generateObjectAttributes(node.absolutePath, node.schema, defs);
    }

    const graph = new SchemaGraph([], []);

    const rootNode = defs.get('')!;
    generateObjectSpecialPropertyEdges(rootNode, defs, graph);
    expect(graph.edges.length).toEqual(2);
    for (const edge of graph.edges) {
      expect(edge.start.absolutePath).toEqual([]);
    }

    // note that the order of the edges as in the same order as in the generation function: if, then, else
    expect(graph.edges[0].end.absolutePath).toEqual(['$defs', 'researcher']);
    expect(graph.edges[0].edgeType).toEqual(EdgeType.IF);
    expect(graph.edges[0].label).toEqual(EdgeType.IF);

    expect(graph.edges[1].end.absolutePath).toEqual(['then']);
    expect(graph.edges[1].edgeType).toEqual(EdgeType.THEN);
    expect(graph.edges[1].label).toEqual(EdgeType.THEN);
  });

  it('trim graph', () => {
    const schemaGraph = new SchemaGraph([], []);
    populateGraph(defs, schemaGraph);

    expect(schemaGraph.nodes.length).toEqual(10);

    trimGraph(schemaGraph);

    expect(schemaGraph.nodes.length).toEqual(5);
  });
});
