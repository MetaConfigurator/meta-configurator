import {describe, expect, it, vi} from 'vitest';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {getSchemaRefinementRejectionReason} from '@/components/toolbar/refineSchema';

vi.mock('@/data/useDataLink', () => ({getDataForMode: vi.fn()}));

describe('schema refinement validation', () => {
  it('allows refinement when all validation errors already existed', () => {
    const originalSchema: TopLevelSchema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: {type: 'string'},
        vessels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {volume: {type: 'number', exclusiveMinimum: 0}},
          },
        },
      },
    };
    const refinedSchema = structuredClone(originalSchema);
    const nameSchema = refinedSchema.properties?.name;
    if (typeof nameSchema === 'object') {
      nameSchema.examples = ['Enzyme experiment'];
    }
    const data = {vessels: [{volume: 0}, {volume: 0}]};

    expect(
      getSchemaRefinementRejectionReason(originalSchema, refinedSchema, data)
    ).toBeNull();
  });

  it('reports only errors introduced by refinement', () => {
    const originalSchema: TopLevelSchema = {
      type: 'object',
      required: ['name'],
      properties: {name: {type: 'string'}, status: {type: 'string'}},
    };
    const refinedSchema: TopLevelSchema = {
      ...structuredClone(originalSchema),
      required: ['name', 'status'],
    };

    const rejectionReason = getSchemaRefinementRejectionReason(
      originalSchema,
      refinedSchema,
      {}
    );

    expect(rejectionReason).toContain("must have required property 'status'");
    expect(rejectionReason).not.toContain("must have required property 'name'");
  });

  it('rejects a new constraint that invalidates previously valid data', () => {
    const originalSchema: TopLevelSchema = {
      type: 'object',
      properties: {status: {type: 'string'}},
    };
    const refinedSchema: TopLevelSchema = {
      type: 'object',
      properties: {status: {type: 'string', enum: ['CLOSED']}},
    };

    expect(
      getSchemaRefinementRejectionReason(originalSchema, refinedSchema, {status: 'OPEN'})
    ).toContain('/status: must be equal to one of the allowed values');
  });
});
