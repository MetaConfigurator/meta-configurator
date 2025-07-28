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
});



describe('tests other special cases', () => {
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
});
