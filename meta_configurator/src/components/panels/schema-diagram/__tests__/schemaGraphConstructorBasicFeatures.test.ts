import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Path} from '@/utility/path';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {EdgeType, SchemaGraph, SchemaObjectNodeData} from '../schemaDiagramTypes';
import {
  generateAttributeEdges,
  generateObjectAttributes,
  generateObjectTitle,
  identifyObjects,
  isSchemaThatDeservesANode,
} from '../schemaGraphConstructor';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('test schema graph constructor with objects and attributes, without advanced keywords such as oneOf', () => {
  let currentPath: Path;
  let schema: TopLevelSchema = {
    type: 'object',
    required: ['propertyObject'],
    $defs: {
      person: {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              city: {type: 'string'},
            },
          },
        },
      },
    },
    properties: {
      propertySimple: {type: 'string', deprecated: true},
      propertyObject: {
        type: 'object',
        properties: {
          someNumber: {type: 'number'},
        },
      },
      propertyObjectWithTitle: {
        type: 'object',
        title: 'MyPropertyObjectWithTitle',
        properties: {
          someString: {type: 'string'},
        },
      },
      propertyRefToSimple: {
        $ref: '#/properties/propertySimple',
      },
      propertyRefToComplex: {
        $ref: '#/properties/propertyObject',
      },
      propertyRefToNestedObject: {
        $ref: '#/$defs/person',
      },
    },
  };

  let defs: Map<string, SchemaObjectNodeData>;

  beforeEach(() => {
    currentPath = [];
    defs = new Map();

    identifyObjects(currentPath, schema, defs);
    // @ts-ignore
    identifyObjects(['$defs', 'person'], schema.$defs.person, defs);
  });

  it('identify objects', () => {
    expect(defs.size).toEqual(12);
    expect(defs.has('')).toBeTruthy();
    expect(defs.has('properties.propertySimple')).toBeTruthy();
    expect(defs.has('properties.propertyObject')).toBeTruthy();
    expect(defs.has('properties.propertyObject.properties.someNumber')).toBeTruthy();
    expect(defs.has('properties.propertyObjectWithTitle')).toBeTruthy();
    expect(defs.has('properties.propertyObjectWithTitle.properties.someString')).toBeTruthy();
    expect(defs.has('properties.propertyRefToSimple')).toBeTruthy();
    expect(defs.has('properties.propertyRefToComplex')).toBeTruthy();
    expect(defs.has('properties.propertyRefToNestedObject')).toBeTruthy();
    expect(defs.has('$defs.person')).toBeTruthy();
    expect(defs.has('$defs.person.properties.address')).toBeTruthy();
    expect(defs.has('$defs.person.properties.address.properties.city')).toBeTruthy();
  });

  it('generate object attributes', () => {
    const rootNode = defs.get('')!;
    expect(rootNode).toBeDefined();
    rootNode.attributes = generateObjectAttributes(rootNode.absolutePath, rootNode.schema, defs);
    expect(rootNode.attributes.length).toEqual(6);
    expect(rootNode.attributes[0].name).toEqual('propertySimple');
    expect(rootNode.attributes[0].absolutePath).toEqual(['properties', 'propertySimple']);
    expect(rootNode.attributes[0].deprecated).toBeTruthy();
    expect(rootNode.attributes[0].required).toBeFalsy();

    expect(rootNode.attributes[1].name).toEqual('propertyObject');
    expect(rootNode.attributes[1].absolutePath).toEqual(['properties', 'propertyObject']);
    expect(rootNode.attributes[1].deprecated).toBeFalsy();
    expect(rootNode.attributes[1].required).toBeTruthy();

    expect(rootNode.attributes[2].name).toEqual('propertyObjectWithTitle');
    expect(rootNode.attributes[2].absolutePath).toEqual(['properties', 'propertyObjectWithTitle']);
    expect(rootNode.attributes[2].deprecated).toBeFalsy();
    expect(rootNode.attributes[2].required).toBeFalsy();

    expect(rootNode.attributes[3].name).toEqual('propertyRefToSimple');
    expect(rootNode.attributes[3].absolutePath).toEqual(['properties', 'propertyRefToSimple']);
    expect(rootNode.attributes[3].deprecated).toBeFalsy();
    expect(rootNode.attributes[3].required).toBeFalsy();

    expect(rootNode.attributes[4].name).toEqual('propertyRefToComplex');
    expect(rootNode.attributes[4].absolutePath).toEqual(['properties', 'propertyRefToComplex']);
    expect(rootNode.attributes[4].deprecated).toBeFalsy();
    expect(rootNode.attributes[4].required).toBeFalsy();

    expect(rootNode.attributes[5].name).toEqual('propertyRefToNestedObject');
    expect(rootNode.attributes[5].absolutePath).toEqual([
      'properties',
      'propertyRefToNestedObject',
    ]);
    expect(rootNode.attributes[5].deprecated).toBeFalsy();
    expect(rootNode.attributes[5].required).toBeFalsy();
  });

  it('generate attribute type description', () => {
    const rootNode = defs.get('')!;
    expect(rootNode).toBeDefined();
    rootNode.attributes = generateObjectAttributes(rootNode.absolutePath, rootNode.schema, defs);

    const attrPropSimple = rootNode.attributes[0];
    expect(attrPropSimple.typeDescription).toEqual('string');

    const attrPropComplex = rootNode.attributes[1];
    expect(attrPropComplex.typeDescription).toEqual('propertyObject');

    const attrPropComplexWithTitle = rootNode.attributes[2];
    // if the object has a title, we use it. Otherwise, we use the attribute name in the schema
    expect(attrPropComplexWithTitle.typeDescription).toEqual('MyPropertyObjectWithTitle');

    const attrPropRefSimple = rootNode.attributes[3];
    // if there is a ref to a simple type, we use the name of the simple type
    expect(attrPropRefSimple.typeDescription).toEqual('propertySimple');

    const attrPropRefComplex = rootNode.attributes[4];
    // reference to object --> use name of object
    expect(attrPropRefComplex.typeDescription).toEqual('propertyObject');

    const attrPropRefNestedObject = rootNode.attributes[5];
    // reference to nested object
    expect(attrPropRefNestedObject.typeDescription).toEqual('person');
  });

  it('generate object title', () => {
    const objectNodeCount = Array.from(defs.values()).filter(node =>
      isSchemaThatDeservesANode(node.schema)
    ).length;
    expect(objectNodeCount).toEqual(5);

    // We care about titles of nodes that define objects only
    const rootNode = defs.get('')!;
    expect(generateObjectTitle(rootNode.absolutePath, rootNode.schema)).toEqual('root');

    const propComplex = defs.get('properties.propertyObject')!;
    expect(generateObjectTitle(propComplex.absolutePath, propComplex.schema)).toEqual(
      'propertyObject'
    );

    const propComplexWithTitle = defs.get('properties.propertyObjectWithTitle')!;
    expect(
      generateObjectTitle(propComplexWithTitle.absolutePath, propComplexWithTitle.schema)
    ).toEqual('MyPropertyObjectWithTitle');

    const person = defs.get('$defs.person')!;
    expect(generateObjectTitle(person.absolutePath, person.schema)).toEqual('person');

    const personAddress = defs.get('$defs.person.properties.address')!;
    expect(generateObjectTitle(personAddress.absolutePath, personAddress.schema)).toEqual(
      'address'
    );
  });

  it('generate attribute edges', () => {
    for (const node of defs.values()) {
      node.attributes = generateObjectAttributes(node.absolutePath, node.schema, defs);
    }

    const graph = new SchemaGraph([], []);

    const rootNode = defs.get('')!;
    generateAttributeEdges(rootNode, defs, graph);
    expect(graph.edges.length).toEqual(4);
    for (const edge of graph.edges) {
      expect(edge.start.absolutePath).toEqual([]);
    }
    expect(graph.edges[0].end.absolutePath).toEqual(['properties', 'propertyObject']);
    expect(graph.edges[0].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[0].label).toEqual('propertyObject');
    expect(graph.edges[0].end.getNodeType() == 'schemaobject').toBeTruthy();

    expect(graph.edges[1].end.absolutePath).toEqual(['properties', 'propertyObjectWithTitle']);
    expect(graph.edges[1].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[1].label).toEqual('propertyObjectWithTitle');
    expect(graph.edges[1].end.getNodeType() == 'schemaobject').toBeTruthy();

    // the edge is not to the ref definition but to the resolved object
    expect(graph.edges[2].end.absolutePath).toEqual(['properties', 'propertyObject']);
    expect(graph.edges[2].edgeType).toEqual(EdgeType.ATTRIBUTE);
    // the label of the edge is the actual attribute name, not the resolved data type
    expect(graph.edges[2].label).toEqual('propertyRefToComplex');
    expect(graph.edges[2].end.getNodeType() == 'schemaobject').toBeTruthy();

    // this edge is not to the ref definition but to the resolved object
    expect(graph.edges[3].end.absolutePath).toEqual(['$defs', 'person']);
    expect(graph.edges[3].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[3].label).toEqual('propertyRefToNestedObject');
    expect(graph.edges[3].end.getNodeType() == 'schemaobject').toBeTruthy();

    graph.edges = [];
    const propComplex = defs.get('properties.propertyObject')!;
    generateAttributeEdges(propComplex, defs, graph);
    // zero attribute edges from propertyObject to its children, because the child object defines just a simple type
    expect(graph.edges.length).toEqual(0);

    graph.edges = [];
    const propComplexWithTitle = defs.get('properties.propertyObjectWithTitle')!;
    generateAttributeEdges(propComplexWithTitle, defs, graph);
    // also zero attribute edges from propertyObjectWithTitle to its children, because the child object defines just a simple type
    expect(graph.edges.length).toEqual(0);

    graph.edges = [];
    const person = defs.get('$defs.person')!;
    generateAttributeEdges(person, defs, graph);
    // one attribute edge from person to address
    expect(graph.edges.length).toEqual(1);
    expect(graph.edges[0].start.absolutePath).toEqual(['$defs', 'person']);
    expect(graph.edges[0].end.absolutePath).toEqual(['$defs', 'person', 'properties', 'address']);
    expect(graph.edges[0].edgeType).toEqual(EdgeType.ATTRIBUTE);
    expect(graph.edges[0].label).toEqual('address');
    expect(graph.edges[0].end.getNodeType() == 'schemaobject').toBeTruthy();
  });
});
