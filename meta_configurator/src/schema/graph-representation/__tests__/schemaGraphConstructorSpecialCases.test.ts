import {describe, expect, it, vi} from 'vitest';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {SchemaGraph} from '../schemaGraphTypes';
import {identifyAllObjects, populateGraph, trimGraph} from '../schemaGraphConstructor';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('tests for more difficult scenarios and special cases that result as a combination of keywords', () => {
  it('anyOf with either one object or an array of these objects', () => {
    let schema: TopLevelSchema = {
      title: 'Workflow Schema',
      type: 'object',
      $defs: {
        step: {
          type: 'object',
          properties: {
            command: {type: 'string'},
          },
        },
        stepArray: {
          type: 'array',
          items: {
            $ref: '#/$defs/step',
          },
        },
      },
      properties: {
        job: {
          anyOf: [
            {
              $ref: '#/$defs/step',
            },
            {
              $ref: '#/$defs/stepArray',
            },
          ],
        },
      },
    };

    const defs = identifyAllObjects(schema);
    const graph = new SchemaGraph([], []);
    populateGraph(defs, graph);
    trimGraph(graph);

    expect(graph.nodes.length).toBe(3);
  });

  it('array of oneOf options should lead to proper edges in the graph', () => {
    // json schema with an propery oneOfArray that is an array of oneOf options.
    let schema: TopLevelSchema = {
      title: 'Treatment Schema',
      type: 'object',
      properties: {
        oneOfArray: {
          type: 'array',
          items: {
            oneOf: [
              {type: 'string', enum: ['chemotherapy', 'radiotherapy', 'surgery']},
              {type: 'string'},
              {type: 'null'},
            ],
            // this is the important part: it used to be that setting the type to a simple type and not having an enum directly, but only in the oneOf, would lead to the enum not being connected to the root node.
            type: ['string', 'null'],
          },
        },
      },
    };

    const defs = identifyAllObjects(schema);
    const graph = new SchemaGraph([], []);
    populateGraph(defs, graph);
    trimGraph(graph);
    expect(graph.nodes.length).toBe(3); // one for the root node, one for the array entry and one for the enum node
    expect(graph.edges.length).toBe(2); // one edge from the root node to the array entry node and one edge from the array entry node to the enum node
  });

  it('object property has a reference but also defines its own things and both nodes (referenced sub-schema and own definition of sub-schema) should be connected with an edge', () => {
    let schema: TopLevelSchema = {
      $defs: {
        HardwareComponents: {},
        Quantity: {
          properties: {
            Unit: {
              enum: ['gram', 'mole', 'celsius', 'kelvin', 'pascal', 'bar'],
              type: 'string',
            },
            Value: {
              type: 'number',
            },
          },
          type: 'object',
        },
        StepEntry: {
          title: 'Step Entry',
          properties: {
            _amount: {
              $ref: '#/$defs/Quantity',
            },
            _pressure: {
              title: 'Pressure in Pascal',
              $ref: '#/$defs/Quantity',
              properties: {
                Unit: {
                  const: 'pascal',
                },
                Value: {
                  minimum: 0,
                },
              },
            },
          },
        },
      },
      properties: {
        Steps: {
          items: {
            $ref: '#/$defs/StepEntry',
          },
          type: 'array',
        },
      },
      required: ['Steps'],
      title: 'Procedure',
      type: 'object',
    };

    const defs = identifyAllObjects(schema);
    const graph = new SchemaGraph([], []);
    populateGraph(defs, graph);
    trimGraph(graph);

    // collect edges outgoing from the StepEntry node pressure attribute
    const stepEntryNode = graph.nodes.find(n => n.name === 'StepEntry');
    expect(stepEntryNode).toBeDefined();
    const outgoingEdges = graph.edges.filter(
      e => e.start === stepEntryNode && e.startSchemaPath.includes('_pressure')
    );

    // there should be two edges: one to the Quantity node (the $ref) and one to the inline definition of the properties
    expect(outgoingEdges.length).toBe(2);
  });
});
