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
  identifyAllObjects,
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
