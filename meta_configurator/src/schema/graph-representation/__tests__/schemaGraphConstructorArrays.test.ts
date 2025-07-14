import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {EdgeType, SchemaGraph, SchemaObjectNodeData} from '../schemaGraphTypes';
import {
  generateAttributeEdges,
  generateObjectAttributes,
  generateObjectFallbackDisplayName,
  identifyAllObjects,
  isSchemaThatDeservesANode,
} from '../schemaGraphConstructor';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('test schema graph constructor with objects and attributes, without advanced keywords such as oneOf', () => {
  let schema: TopLevelSchema = {
    type: 'object',
    required: ['propertyObject'],
    $defs: {
      person: {
        title: 'PersonTitle',
        type: 'object',
        properties: {
          age: {
            type: 'integer',
          },
        },
      },
      lastName: {
        type: 'string',
      },
      arrayProperty: {
        type: 'array',
        items: {
          type: 'boolean',
        },
      },
      arrayObjectProperty: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            someNumber: {type: 'number'},
          },
        },
      },
    },
    properties: {
      propertyArrayToSimple: {
        type: 'array',
        items: {
          type: 'boolean',
        },
      },
      propertyArrayToComplex: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            someNumber: {type: 'number'},
          },
        },
      },
      propertyArrayToRefSimple: {
        type: 'array',
        items: {
          $ref: '#/$defs/lastName',
        },
      },
      propertyArrayToRefComplexWithTitle: {
        type: 'array',
        items: {
          $ref: '#/$defs/person',
        },
      },
      propertyRefToArraySimple: {
        $ref: '#/$defs/arrayProperty',
      },
      propertyRefToArrayComplex: {
        $ref: '#/$defs/arrayObjectProperty',
      },
    },
  };

  let defs: Map<string, SchemaObjectNodeData>;

  beforeEach(() => {
    defs = identifyAllObjects(schema);
  });

  it('identify objects', () => {
    expect(defs.size).toEqual(20);
    expect(defs.has('$defs.person')).toBeTruthy();
    expect(defs.has('$defs.person.properties.age')).toBeTruthy();
    expect(defs.has('$defs.lastName')).toBeTruthy();
    expect(defs.has('$defs.arrayProperty')).toBeTruthy();
    expect(defs.has('$defs.arrayProperty.items')).toBeTruthy();
    expect(defs.has('$defs.arrayObjectProperty')).toBeTruthy();
    expect(defs.has('$defs.arrayObjectProperty.items')).toBeTruthy();
    expect(defs.has('$defs.arrayObjectProperty.items.properties.someNumber')).toBeTruthy();
    expect(defs.has('')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToSimple')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToSimple.items')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToComplex')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToComplex.items')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToComplex.items.properties.someNumber')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToRefSimple')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToRefSimple.items')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToRefComplexWithTitle')).toBeTruthy();
    expect(defs.has('properties.propertyArrayToRefComplexWithTitle.items')).toBeTruthy();
    expect(defs.has('properties.propertyRefToArraySimple')).toBeTruthy();
    expect(defs.has('properties.propertyRefToArrayComplex')).toBeTruthy();
  });

  it('generate object attributes', () => {
    const rootNode = defs.get('')!;
    expect(rootNode).toBeDefined();
    rootNode.attributes = generateObjectAttributes(rootNode.absolutePath, rootNode.schema, defs);
    expect(rootNode.attributes.length).toEqual(6);

    expect(rootNode.attributes[0].name).toEqual('propertyArrayToSimple');
    expect(rootNode.attributes[0].title).toEqual(undefined);
    expect(rootNode.attributes[0].absolutePath).toEqual(['properties', 'propertyArrayToSimple']);
    expect(rootNode.attributes[0].deprecated).toBeFalsy();
    expect(rootNode.attributes[0].required).toBeFalsy();

    expect(rootNode.attributes[1].name).toEqual('propertyArrayToComplex');
    expect(rootNode.attributes[1].title).toEqual(undefined);
    expect(rootNode.attributes[1].absolutePath).toEqual(['properties', 'propertyArrayToComplex']);
    expect(rootNode.attributes[1].deprecated).toBeFalsy();
    expect(rootNode.attributes[1].required).toBeFalsy();

    expect(rootNode.attributes[2].name).toEqual('propertyArrayToRefSimple');
    expect(rootNode.attributes[2].title).toEqual(undefined);
    expect(rootNode.attributes[2].absolutePath).toEqual(['properties', 'propertyArrayToRefSimple']);
    expect(rootNode.attributes[2].deprecated).toBeFalsy();
    expect(rootNode.attributes[2].required).toBeFalsy();

    expect(rootNode.attributes[3].name).toEqual('propertyArrayToRefComplexWithTitle');
    expect(rootNode.attributes[3].title).toEqual(undefined);
    expect(rootNode.attributes[3].absolutePath).toEqual([
      'properties',
      'propertyArrayToRefComplexWithTitle',
    ]);
    expect(rootNode.attributes[3].deprecated).toBeFalsy();
    expect(rootNode.attributes[3].required).toBeFalsy();

    expect(rootNode.attributes[4].name).toEqual('propertyRefToArraySimple');
    expect(rootNode.attributes[4].title).toEqual(undefined);
    expect(rootNode.attributes[4].absolutePath).toEqual(['properties', 'propertyRefToArraySimple']);
    expect(rootNode.attributes[4].deprecated).toBeFalsy();
    expect(rootNode.attributes[4].required).toBeFalsy();

    expect(rootNode.attributes[5].name).toEqual('propertyRefToArrayComplex');
    expect(rootNode.attributes[5].title).toEqual(undefined);
    expect(rootNode.attributes[5].absolutePath).toEqual([
      'properties',
      'propertyRefToArrayComplex',
    ]);
    expect(rootNode.attributes[5].deprecated).toBeFalsy();
    expect(rootNode.attributes[5].required).toBeFalsy();
  });

  it('generate attribute type description', () => {
    const rootNode = defs.get('')!;
    expect(rootNode).toBeDefined();
    rootNode.attributes = generateObjectAttributes(rootNode.absolutePath, rootNode.schema, defs);

    const attrPropArraySimple = rootNode.attributes[0];
    // array of booleans
    expect(attrPropArraySimple.typeDescription).toEqual('boolean[]');

    const attrPropArrayComplex = rootNode.attributes[1];
    // array to inlined object.
    expect(attrPropArrayComplex.typeDescription).toEqual('propertyArrayToComplex entry[]');

    const attrPropArrayRefSimple = rootNode.attributes[2];
    // array to ref of simple type
    expect(attrPropArrayRefSimple.typeDescription).toEqual('string[]');

    const attrPropArrayRefComplexWithTitle = rootNode.attributes[3];
    // array to ref of complex type
    expect(attrPropArrayRefComplexWithTitle.typeDescription).toEqual('PersonTitle[]');

    const attrPropRefToArraySimple = rootNode.attributes[4];
    // reference to array of booleans
    expect(attrPropRefToArraySimple.typeDescription).toEqual('arrayProperty');

    const attrPropRefToArrayComplex = rootNode.attributes[5];
    // reference to array of objects. We take the name of the object as the type description
    expect(attrPropRefToArrayComplex.typeDescription).toEqual('arrayObjectProperty');
  });

  it('generate object fallback display name', () => {
    const objectNodeCount = Array.from(defs.values()).filter(node =>
      isSchemaThatDeservesANode(node.schema)
    ).length;
    expect(objectNodeCount).toEqual(4);

    // We care about titles of nodes that define objects only
    const rootNode = defs.get('')!;
    expect(
      generateObjectFallbackDisplayName(
        rootNode.absolutePath,
        rootNode.hasUserDefinedName,
        rootNode.schema,
        schema
      )
    ).toEqual('root');

    const propArrayComplexItem = defs.get('properties.propertyArrayToComplex.items')!;
    expect(
      generateObjectFallbackDisplayName(
        propArrayComplexItem.absolutePath,
        propArrayComplexItem.hasUserDefinedName,
        propArrayComplexItem.schema,
        schema
      )
    ).toEqual('propertyArrayToComplex entry');

    const defsArrayPropItem = defs.get('$defs.arrayObjectProperty.items')!;
    expect(
      generateObjectFallbackDisplayName(
        defsArrayPropItem.absolutePath,
        defsArrayPropItem.hasUserDefinedName,
        defsArrayPropItem.schema,
        schema
      )
    ).toEqual('arrayObjectProperty entry');

    const defsArrayObjectPropItem = defs.get('$defs.arrayObjectProperty.items')!;
    expect(
      generateObjectFallbackDisplayName(
        defsArrayObjectPropItem.absolutePath,
        defsArrayObjectPropItem.hasUserDefinedName,
        defsArrayObjectPropItem.schema,
        schema
      )
    ).toEqual('arrayObjectProperty entry');

    const person = defs.get('$defs.person')!;
    expect(
      generateObjectFallbackDisplayName(
        person.absolutePath,
        person.hasUserDefinedName,
        person.schema,
        schema
      )
    ).toEqual('person');
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

    // for this array, because the object is inlined, the edge is to the inlined object
    expect(graph.edges[0].end.absolutePath).toEqual([
      'properties',
      'propertyArrayToComplex',
      'items',
    ]);
    expect(graph.edges[0].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[0].isArray).toEqual(true);
    expect(graph.edges[0].label).toEqual('propertyArrayToComplex');

    // for this array, because the object is not inlined, the edge is to the object node
    expect(graph.edges[1].end.absolutePath).toEqual(['$defs', 'person']);
    expect(graph.edges[1].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[1].isArray).toEqual(true);
    expect(graph.edges[1].label).toEqual('propertyArrayToRefComplexWithTitle');

    // this is a very tricky one: it needs resolving of the reference to the array and then the object behind the array
    expect(graph.edges[2].end.absolutePath).toEqual(['$defs', 'arrayObjectProperty', 'items']);
    expect(graph.edges[2].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[2].isArray).toEqual(true);
    expect(graph.edges[2].label).toEqual('propertyRefToArrayComplex');

    graph.edges = [];
    const propArrayComplexItem = defs.get('properties.propertyArrayToComplex.items')!;
    generateAttributeEdges(propArrayComplexItem, defs, graph);
    // same here: no attribute edges from items to its children, because the child object defines just a simple type
    expect(graph.edges.length).toEqual(0);

    graph.edges = [];
    const person = defs.get('$defs.person')!;
    generateAttributeEdges(person, defs, graph);
    expect(graph.edges.length).toEqual(0);

    graph.edges = [];
    const arrayObjectPropItem = defs.get('$defs.arrayObjectProperty.items')!;
    generateAttributeEdges(arrayObjectPropItem, defs, graph);
    expect(graph.edges.length).toEqual(0);
  });
});
