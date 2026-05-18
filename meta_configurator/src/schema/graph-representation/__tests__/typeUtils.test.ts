import {describe, expect, it} from 'vitest';
import {reactive} from 'vue';
import {collectTypeChoices, determineTypeChoiceBySchema} from '../typeUtils';
import {SchemaObjectNodeData} from '../schemaGraphTypes';
import type {JsonSchemaObjectType, TopLevelSchema} from '@/schema/jsonSchemaType';
import {getAllowedTypesOfSchema, setSchemaNullable} from '@/schema/schemaReadingUtils';

describe('type utils nullable support', () => {
  it('infers allowed types from an internal reference without an explicit type', () => {
    const rootSchema: TopLevelSchema = {
      $defs: {
        person: {
          properties: {
            name: {
              type: 'string',
            },
          },
        },
      },
      properties: {
        assignee: {
          $ref: '#/$defs/person',
        },
      },
    };

    expect(getAllowedTypesOfSchema(rootSchema.properties!.assignee as any, rootSchema)).toEqual([
      'object',
    ]);
  });

  it('adds and removes null on a direct type', () => {
    const schema: JsonSchemaObjectType = {
      type: 'string',
    };

    setSchemaNullable(schema, true);
    expect(schema.type).toEqual(['string', 'null']);

    setSchemaNullable(schema, false);
    expect(schema.type).toBe('string');
  });

  it('adds null to a referenced schema while keeping the reference', () => {
    const rootSchema: TopLevelSchema = {
      $defs: {
        person: {
          properties: {
            name: {
              type: 'string',
            },
          },
        },
      },
      properties: {
        assignee: {
          $ref: '#/$defs/person',
        },
      },
    };

    const attributeSchema = structuredClone(rootSchema.properties!.assignee as any);
    setSchemaNullable(attributeSchema, true, rootSchema);

    expect(attributeSchema).toEqual({
      $ref: '#/$defs/person',
      type: ['object', 'null'],
    });
  });

  it('matches a nullable scalar schema to its non-null type choice', () => {
    const choices = collectTypeChoices([]);

    expect(determineTypeChoiceBySchema(choices, {type: ['string', 'null']})).toEqual(
      choices.find(choice => choice.label === 'string')
    );
  });

  it('matches a nullable reactive schema without cloning errors', () => {
    const choices = collectTypeChoices([]);
    const schema = reactive<JsonSchemaObjectType>({
      type: ['string', 'null'],
    });

    expect(determineTypeChoiceBySchema(choices, schema)).toEqual(
      choices.find(choice => choice.label === 'string')
    );
  });

  it('matches a nullable referenced schema to the referenced type choice', () => {
    const choices = collectTypeChoices([
      new SchemaObjectNodeData('person', undefined, 'person', true, ['$defs', 'person'], {}, []),
    ]);

    expect(
      determineTypeChoiceBySchema(choices, {
        $ref: '#/$defs/person',
        type: ['object', 'null'],
      })
    ).toEqual(choices.find(choice => choice.label === 'person'));
  });
});
