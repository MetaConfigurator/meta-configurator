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
  constructSchemaGraph,
  generateAttributeEdges,
  generateObjectAttributes,
  identifyObjects,
  populateGraph,
  trimGraph,
  trimNodeChildren,
} from '../schemaGraphConstructor';
import {useSettings} from '@/settings/useSettings';
import {findBestMatchingNode} from '../schemaDiagramHelper';

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
  let graph: SchemaGraph;
  let schema: TopLevelSchema = {
    type: 'object',
    $defs: {
      enumString: {
        type: 'string',
        enum: ['value1', 'value2'],
      },
      person: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          age: {
            type: 'integer',
          },
        },
      },
    },
    properties: {
      propertyRef: {
        $ref: '#/$defs/person',
      },
      propertyEnumArrayRef: {
        type: 'array',
        items: {
          $ref: '#/$defs/enumString',
        },
      },
      propertyComposition: {
        type: 'object',
        properties: {
          oneOfProperty: {
            oneOf: [
              {
                type: 'string',
              },
              {
                type: 'object',
                properties: {
                  stringProperty: {
                    type: 'string',
                  },
                },
              },
            ],
          },
        },
      },
      propertyNestedObject: {
        type: 'object',
        properties: {
          nestedPropertyFirst: {
            type: 'object',
            properties: {
              nestedPropertySecond: {
                type: 'string',
              },
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    graph = constructSchemaGraph(schema);
  });

  it('identify best matching node', () => {
    const nodes = graph.toVueFlowGraph().nodes;

    // root path should lead to root node
    expect(findBestMatchingNode(nodes, [])!.data).toEqual(graph.findNode(''));

    // child of root without its own node should lead to root node
    expect(findBestMatchingNode(nodes, ['type'])!.data).toEqual(graph.findNode(''));
    expect(findBestMatchingNode(nodes, ['properties'])!.data).toEqual(graph.findNode(''));

    // path to enumString should lead to enumString node
    expect(findBestMatchingNode(nodes, ['$defs', 'enumString'])!.data).toEqual(
      graph.findNode('$defs.enumString')
    );

    // child of enumString without its own node should lead to enumString node
    expect(findBestMatchingNode(nodes, ['$defs', 'enumString', 'type'])!.data).toEqual(
      graph.findNode('$defs.enumString')
    );
    expect(findBestMatchingNode(nodes, ['$defs', 'enumString', 'enum'])!.data).toEqual(
      graph.findNode('$defs.enumString')
    );

    // path to person should lead to person node
    expect(findBestMatchingNode(nodes, ['$defs', 'person'])!.data).toEqual(
      graph.findNode('$defs.person')
    );

    // child of person without its own node should lead to person node
    expect(findBestMatchingNode(nodes, ['$defs', 'person', 'type'])!.data).toEqual(
      graph.findNode('$defs.person')
    );
    expect(findBestMatchingNode(nodes, ['$defs', 'person', 'properties'])!.data).toEqual(
      graph.findNode('$defs.person')
    );
    expect(findBestMatchingNode(nodes, ['$defs', 'person', 'properties', 'name'])!.data).toEqual(
      graph.findNode('$defs.person')
    );
    expect(
      findBestMatchingNode(nodes, ['$defs', 'person', 'properties', 'name', 'type'])!.data
    ).toEqual(graph.findNode('$defs.person'));
    expect(findBestMatchingNode(nodes, ['$defs', 'person', 'properties', 'age'])!.data).toEqual(
      graph.findNode('$defs.person')
    );
    expect(
      findBestMatchingNode(nodes, ['$defs', 'person', 'properties', 'age', 'type'])!.data
    ).toEqual(graph.findNode('$defs.person'));

    // path to propertyRef and propertyEnumArrayRef should lead to just root object, because there is no node for propertyRef because it is a reference
    expect(findBestMatchingNode(nodes, ['properties', 'propertyRef'])!.data).toEqual(
      graph.findNode('')
    );
    expect(findBestMatchingNode(nodes, ['properties', 'propertyRef', '$ref'])!.data).toEqual(
      graph.findNode('')
    );
    expect(findBestMatchingNode(nodes, ['properties', 'propertyEnumArrayRef'])!.data).toEqual(
      graph.findNode('')
    );
    expect(
      findBestMatchingNode(nodes, ['properties', 'propertyEnumArrayRef', '$ref'])!.data
    ).toEqual(graph.findNode(''));

    // path to propertyComposition should lead to composition property node
    expect(findBestMatchingNode(nodes, ['properties', 'propertyComposition'])!.data).toEqual(
      graph.findNode('properties.propertyComposition')
    );
    expect(
      findBestMatchingNode(nodes, ['properties', 'propertyComposition', 'type'])!.data
    ).toEqual(graph.findNode('properties.propertyComposition'));
    expect(
      findBestMatchingNode(nodes, ['properties', 'propertyComposition', 'properties'])!.data
    ).toEqual(graph.findNode('properties.propertyComposition'));

    // path to propertyComposition oneOf should lead to oneOf node
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyComposition',
        'properties',
        'oneOfProperty',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyComposition.properties.oneOfProperty'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyComposition',
        'properties',
        'oneOfProperty',
        'oneOf',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyComposition.properties.oneOfProperty'));

    // path to propertyComposition oneOf 0 does not lead to oneOf node because there is a string behind it
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyComposition',
        'properties',
        'oneOfProperty',
        'oneOf',
        0,
      ])!.data
    ).toEqual(graph.findNode('properties.propertyComposition.properties.oneOfProperty'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyComposition',
        'properties',
        'oneOfProperty',
        'oneOf',
        0,
        'type',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyComposition.properties.oneOfProperty'));

    // path to propertyComposition oneOf 1 should lead to oneOf node because there is an object behind it
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyComposition',
        'properties',
        'oneOfProperty',
        'oneOf',
        1,
      ])!.data
    ).toEqual(graph.findNode('properties.propertyComposition.properties.oneOfProperty.oneOf[1]'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyComposition',
        'properties',
        'oneOfProperty',
        'oneOf',
        1,
        'type',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyComposition.properties.oneOfProperty.oneOf[1]'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyComposition',
        'properties',
        'oneOfProperty',
        'oneOf',
        1,
        'properties',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyComposition.properties.oneOfProperty.oneOf[1]'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyComposition',
        'properties',
        'oneOfProperty',
        'oneOf',
        1,
        'properties',
        'stringProperty',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyComposition.properties.oneOfProperty.oneOf[1]'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyComposition',
        'properties',
        'oneOfProperty',
        'oneOf',
        1,
        'properties',
        'stringProperty',
        'type',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyComposition.properties.oneOfProperty.oneOf[1]'));

    // path to propertyNestedObject should lead to nested object node
    expect(findBestMatchingNode(nodes, ['properties', 'propertyNestedObject'])!.data).toEqual(
      graph.findNode('properties.propertyNestedObject')
    );
    expect(
      findBestMatchingNode(nodes, ['properties', 'propertyNestedObject', 'type'])!.data
    ).toEqual(graph.findNode('properties.propertyNestedObject'));
    expect(
      findBestMatchingNode(nodes, ['properties', 'propertyNestedObject', 'properties'])!.data
    ).toEqual(graph.findNode('properties.propertyNestedObject'));

    // path to propertyNestedObject nestedPropertyFirst should lead to nested property first node
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyNestedObject',
        'properties',
        'nestedPropertyFirst',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyNestedObject.properties.nestedPropertyFirst'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyNestedObject',
        'properties',
        'nestedPropertyFirst',
        'type',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyNestedObject.properties.nestedPropertyFirst'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyNestedObject',
        'properties',
        'nestedPropertyFirst',
        'properties',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyNestedObject.properties.nestedPropertyFirst'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyNestedObject',
        'properties',
        'nestedPropertyFirst',
        'properties',
        'nestedPropertySecond',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyNestedObject.properties.nestedPropertyFirst'));
    expect(
      findBestMatchingNode(nodes, [
        'properties',
        'propertyNestedObject',
        'properties',
        'nestedPropertyFirst',
        'properties',
        'nestedPropertySecond',
        'type',
      ])!.data
    ).toEqual(graph.findNode('properties.propertyNestedObject.properties.nestedPropertyFirst'));
  });
});
