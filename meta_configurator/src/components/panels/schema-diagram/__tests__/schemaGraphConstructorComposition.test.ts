import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Path} from '@/utility/path';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {EdgeType, SchemaGraph, SchemaObjectNodeData} from '../schemaDiagramTypes';
import {
  generateAttributeEdges,
  generateObjectAttributes,
  generateObjectSpecialPropertyEdges,
  generateObjectTitle,
  identifyObjects,
  isObjectSchema,
  isSchemaThatDeservesANode,
} from '../schemaGraphConstructor';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('test schema graph constructor with objects and compositional keywords', () => {
  let currentPath: Path;
  let schema: TopLevelSchema = {
    type: 'object',
    required: ['propertyObject'],
    $defs: {
      person: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {type: 'string'},
        },
      },
      animal: {
        type: 'object',
        required: ['species'],
        properties: {
          species: {type: 'string'},
        },
      },
      researcher: {
        required: ['researchField'],
        type: 'object',
        properties: {
          researchField: {type: 'string'},
        },
      },
      livingBeing: {
        type: 'object',
        required: ['age'],
        properties: {
          age: {type: 'number'},
        },
      },
      compositionalWithoutObjectType: {
        oneOf: [{$ref: '#/$defs/person'}, {$ref: '#/$defs/animal'}],
      },
    },
    properties: {
      propertySimple: {
        type: 'string',
      },
      propertyRefToCompositional: {
        $ref: '#/$defs/compositionalWithoutObjectType',
      },
      propertyArrayToCompositional: {
        type: 'array',
        items: {
          $ref: '#/$defs/compositionalWithoutObjectType',
        },
      },
      propertyArrayInlineCompositional: {
        type: 'array',
        items: {
          allOf: [{$ref: '#/$defs/person'}, {$ref: '#/$defs/animal'}],
        },
      },
    },
    allOf: [
      {
        $ref: '#/$defs/livingBeing',
      },
      {
        type: 'object',
        properties: {
          address: {
            type: 'string',
          },
        },
      },
    ],
    oneOf: [
      {
        $ref: '#/$defs/researcher',
      },
      {
        title: 'Farmer',
        type: 'object',
        properties: {
          farmSize: {type: 'number'},
        },
      },
    ],
    anyOf: [
      {
        $ref: '#/$defs/person',
      },
      {
        $ref: '#/$defs/animal',
      },
    ],
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
    expect(defs.size).toEqual(28);
    expect(defs.has('')).toBeTruthy();
    expect(defs.has('$defs.person')).toBeTruthy();
    expect(defs.has('$defs.person.properties.name')).toBeTruthy();
    expect(defs.has('$defs.animal')).toBeTruthy();
    expect(defs.has('$defs.animal.properties.species')).toBeTruthy();
    expect(defs.has('$defs.researcher')).toBeTruthy();
    expect(defs.has('$defs.researcher.properties.researchField')).toBeTruthy();
    expect(defs.has('$defs.livingBeing')).toBeTruthy();
    expect(defs.has('$defs.livingBeing.properties.age')).toBeTruthy();
    expect(defs.has('$defs.compositionalWithoutObjectType')).toBeTruthy();
    expect(defs.has('$defs.compositionalWithoutObjectType.oneOf[0]')).toBeTruthy();
    expect(defs.has('$defs.compositionalWithoutObjectType.oneOf[1]')).toBeTruthy();
    expect(defs.has('properties.propertySimple')).toBeTruthy();
    expect(defs.has('properties.propertyRefToCompositional')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToCompositional')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToCompositional.items')).toBeTruthy();
    expect(defs.has('properties.propertyArrayInlineCompositional')).toBeTruthy();
    expect(defs.has('properties.propertyArrayInlineCompositional.items')).toBeTruthy();
    expect(defs.has('properties.propertyArrayInlineCompositional.items.allOf[0]')).toBeTruthy();
    expect(defs.has('properties.propertyArrayInlineCompositional.items.allOf[1]')).toBeTruthy();
    expect(defs.has('allOf[0]')).toBeTruthy();
    expect(defs.has('allOf[1]')).toBeTruthy();
    expect(defs.has('allOf[1].properties.address')).toBeTruthy();
    expect(defs.has('oneOf[0]')).toBeTruthy();
    expect(defs.has('oneOf[1]')).toBeTruthy();
    expect(defs.has('oneOf[2]')).toBeFalsy();
    expect(defs.has('oneOf[1].properties.farmSize')).toBeTruthy();
    expect(defs.has('anyOf[0]')).toBeTruthy();
    expect(defs.has('anyOf[1]')).toBeTruthy();
  });

  it('generate object attributes', () => {
    const rootNode = defs.get('')!;
    expect(rootNode).toBeDefined();
    rootNode.attributes = generateObjectAttributes(rootNode.absolutePath, rootNode.schema, defs);

    expect(rootNode.attributes.length).toEqual(4);
    expect(rootNode.attributes[0].name).toEqual('propertySimple');
    expect(rootNode.attributes[0].absolutePath).toEqual(['properties', 'propertySimple']);

    expect(rootNode.attributes[1].name).toEqual('propertyRefToCompositional');
    expect(rootNode.attributes[1].absolutePath).toEqual([
      'properties',
      'propertyRefToCompositional',
    ]);

    expect(rootNode.attributes[2].name).toEqual('propertyArrayToCompositional');
    expect(rootNode.attributes[2].absolutePath).toEqual([
      'properties',
      'propertyArrayToCompositional',
    ]);

    expect(rootNode.attributes[3].name).toEqual('propertyArrayInlineCompositional');
    expect(rootNode.attributes[3].absolutePath).toEqual([
      'properties',
      'propertyArrayInlineCompositional',
    ]);
  });

  it('generate object title', () => {
    // filter defs for nodes that have schema.type 'object'
    const objectNodeCount = Array.from(defs.values()).filter(node =>
      isSchemaThatDeservesANode(node.schema)
    ).length;
    expect(objectNodeCount).toEqual(9);

    // We care about titles of nodes that define objects only
    const rootNode = defs.get('')!;
    expect(generateObjectTitle(rootNode.absolutePath, rootNode.schema)).toEqual('root');

    const person = defs.get('$defs.person')!;
    expect(generateObjectTitle(person.absolutePath, person.schema)).toEqual('person');

    const animal = defs.get('$defs.animal')!;
    expect(generateObjectTitle(animal.absolutePath, animal.schema)).toEqual('animal');

    const researcher = defs.get('$defs.researcher')!;
    expect(generateObjectTitle(researcher.absolutePath, researcher.schema)).toEqual('researcher');

    const livingBeing = defs.get('$defs.livingBeing')!;
    expect(generateObjectTitle(livingBeing.absolutePath, livingBeing.schema)).toEqual(
      'livingBeing'
    );

    const compositionalWithoutObjectType = defs.get('$defs.compositionalWithoutObjectType')!;
    expect(
      generateObjectTitle(
        compositionalWithoutObjectType.absolutePath,
        compositionalWithoutObjectType.schema
      )
    ).toEqual('compositionalWithoutObjectType');

    const inlineCompositional = defs.get('properties.propertyArrayInlineCompositional.items')!;
    expect(
      generateObjectTitle(inlineCompositional.absolutePath, inlineCompositional.schema)
    ).toEqual('items');

    const allOf1 = defs.get('allOf[1]')!;
    // allOf element at index 1 has no title, so we use the index as title
    expect(generateObjectTitle(allOf1.absolutePath, allOf1.schema)).toEqual('allOf[1]');

    const oneOf1 = defs.get('oneOf[1]')!;
    // oneOf element at index 1 has a title, so we use it
    expect(generateObjectTitle(oneOf1.absolutePath, oneOf1.schema)).toEqual('Farmer');
  });

  it('generate special property edges', () => {
    for (const node of defs.values()) {
      node.attributes = generateObjectAttributes(node.absolutePath, node.schema, defs);
    }

    const graph = new SchemaGraph([], []);

    for (const node of defs.values()) {
      if (isObjectSchema(node.schema)) {
        generateAttributeEdges(node, defs, graph);
        generateObjectSpecialPropertyEdges(node, defs, graph);
      }
    }

    expect(graph.edges.length).toEqual(13);

    expect(graph.edges[0].start.absolutePath).toEqual([]);
    expect(graph.edges[0].end.absolutePath).toEqual(['$defs', 'compositionalWithoutObjectType']);
    expect(graph.edges[0].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[0].isArray).toEqual(false);
    expect(graph.edges[0].label).toEqual('propertyRefToCompositional');

    expect(graph.edges[1].start.absolutePath).toEqual([]);
    expect(graph.edges[1].end.absolutePath).toEqual(['$defs', 'compositionalWithoutObjectType']);
    expect(graph.edges[1].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[1].isArray).toEqual(true);
    expect(graph.edges[1].label).toEqual('propertyArrayToCompositional');

    expect(graph.edges[2].start.absolutePath).toEqual([]);
    expect(graph.edges[2].end.absolutePath).toEqual([
      'properties',
      'propertyArrayInlineCompositional',
      'items',
    ]);
    expect(graph.edges[2].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[2].isArray).toEqual(true);

    // note that the order of the edges as in the same order as in the generation function: oneOf, anyOf, allOf, if, then, else
    expect(graph.edges[3].start.absolutePath).toEqual([]);
    expect(graph.edges[3].end.absolutePath).toEqual(['$defs', 'researcher']);
    expect(graph.edges[3].edgeType).toEqual(EdgeType.ONE_OF);
    expect(graph.edges[3].label).toEqual(EdgeType.ONE_OF);
    expect(graph.edges[3].isArray).toEqual(false);

    expect(graph.edges[4].start.absolutePath).toEqual([]);
    expect(graph.edges[4].end.absolutePath).toEqual(['oneOf', 1]);
    expect(graph.edges[4].edgeType).toEqual(EdgeType.ONE_OF);
    expect(graph.edges[4].label).toEqual(EdgeType.ONE_OF);

    expect(graph.edges[5].start.absolutePath).toEqual([]);
    expect(graph.edges[5].end.absolutePath).toEqual(['$defs', 'person']);
    expect(graph.edges[5].edgeType).toEqual(EdgeType.ANY_OF);
    expect(graph.edges[5].label).toEqual(EdgeType.ANY_OF);

    expect(graph.edges[6].start.absolutePath).toEqual([]);
    expect(graph.edges[6].end.absolutePath).toEqual(['$defs', 'animal']);
    expect(graph.edges[6].edgeType).toEqual(EdgeType.ANY_OF);
    expect(graph.edges[6].label).toEqual(EdgeType.ANY_OF);

    expect(graph.edges[7].start.absolutePath).toEqual([]);
    expect(graph.edges[7].end.absolutePath).toEqual(['$defs', 'livingBeing']);
    expect(graph.edges[7].edgeType).toEqual(EdgeType.ALL_OF);
    expect(graph.edges[7].label).toEqual(EdgeType.ALL_OF);

    expect(graph.edges[8].start.absolutePath).toEqual([]);
    expect(graph.edges[8].end.absolutePath).toEqual(['allOf', 1]);
    expect(graph.edges[8].edgeType).toEqual(EdgeType.ALL_OF);
    expect(graph.edges[8].label).toEqual(EdgeType.ALL_OF);

    expect(graph.edges[9].start.absolutePath).toEqual([
      'properties',
      'propertyArrayInlineCompositional',
      'items',
    ]);
    expect(graph.edges[9].end.absolutePath).toEqual(['$defs', 'person']);
    expect(graph.edges[9].edgeType).toEqual(EdgeType.ALL_OF);
    expect(graph.edges[9].label).toEqual(EdgeType.ALL_OF);

    expect(graph.edges[10].start.absolutePath).toEqual([
      'properties',
      'propertyArrayInlineCompositional',
      'items',
    ]);
    expect(graph.edges[10].end.absolutePath).toEqual(['$defs', 'animal']);
    expect(graph.edges[10].edgeType).toEqual(EdgeType.ALL_OF);
    expect(graph.edges[10].label).toEqual(EdgeType.ALL_OF);

    expect(graph.edges[11].start.absolutePath).toEqual(['$defs', 'compositionalWithoutObjectType']);
    expect(graph.edges[11].end.absolutePath).toEqual(['$defs', 'person']);
    expect(graph.edges[11].edgeType).toEqual(EdgeType.ONE_OF);
    expect(graph.edges[11].label).toEqual(EdgeType.ONE_OF);

    expect(graph.edges[12].start.absolutePath).toEqual(['$defs', 'compositionalWithoutObjectType']);
    expect(graph.edges[12].end.absolutePath).toEqual(['$defs', 'animal']);
    expect(graph.edges[12].edgeType).toEqual(EdgeType.ONE_OF);
    expect(graph.edges[12].label).toEqual(EdgeType.ONE_OF);
  });
});
