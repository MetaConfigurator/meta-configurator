import {describe, expect, it} from 'vitest';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import {SETTINGS_SCHEMA} from '@/settings/settingsSchema';
import {resolveInternalReferenceSchema} from '@/schema/schemaReferenceUtils';
import {mergeAllOfs} from '@/schema/mergeAllOfs';
import {nonBooleanSchema} from '@/schema/schemaTypeUtils';

function resolveSchema(schema: any, rootSchema: any): any {
  const referencedSchema = schema?.$ref
    ? resolveInternalReferenceSchema(schema.$ref, rootSchema)
    : schema;
  const mergedSchema = referencedSchema?.allOf ? mergeAllOfs(referencedSchema) : referencedSchema;
  return nonBooleanSchema(mergedSchema);
}

function findDefaultKeysMissingRequired(
  schema: any,
  defaultValue: any,
  rootSchema: any,
  path: string[] = []
): string[] {
  const resolvedSchema = resolveSchema(schema, rootSchema);
  const missing: string[] = [];

  if (resolvedSchema?.type === 'array' && Array.isArray(defaultValue)) {
    for (const item of defaultValue) {
      missing.push(
        ...findDefaultKeysMissingRequired(resolvedSchema.items, item, rootSchema, [...path, '[]'])
      );
    }
    return missing;
  }

  if (
    resolvedSchema?.type !== 'object' ||
    defaultValue === null ||
    typeof defaultValue !== 'object' ||
    Array.isArray(defaultValue)
  ) {
    return missing;
  }

  const schemaProperties = resolvedSchema.properties ?? {};
  const required = new Set(resolvedSchema.required ?? []);

  if (resolvedSchema.additionalProperties === false) {
    for (const key of Object.keys(defaultValue)) {
      if (schemaProperties[key] !== undefined && !required.has(key)) {
        missing.push([...path, key].join('.'));
      }
    }
  }

  for (const [key, propertySchema] of Object.entries(schemaProperties)) {
    if (key in defaultValue) {
      missing.push(
        ...findDefaultKeysMissingRequired(propertySchema, defaultValue[key], rootSchema, [
          ...path,
          key,
        ])
      );
    }
  }

  return [...new Set(missing)];
}

describe('settings schema consistency', () => {
  it('marks all defaulted fields in closed settings objects as required for migration', () => {
    expect(
      findDefaultKeysMissingRequired(SETTINGS_SCHEMA, SETTINGS_DATA_DEFAULT, SETTINGS_SCHEMA)
    ).toEqual([]);
  });

  it('finds defaulted properties missing from required in closed objects', () => {
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['present'],
      properties: {
        present: {type: 'string'},
        missing: {type: 'string'},
      },
    };
    const defaults = {
      present: 'ok',
      missing: 'should be required',
    };

    expect(findDefaultKeysMissingRequired(schema, defaults, schema)).toEqual(['missing']);
  });

  it('does not require defaulted properties in open objects', () => {
    const schema = {
      type: 'object',
      additionalProperties: true,
      required: ['present'],
      properties: {
        present: {type: 'string'},
        optional: {type: 'string'},
      },
    };
    const defaults = {
      present: 'ok',
      optional: 'allowed to be optional',
    };

    expect(findDefaultKeysMissingRequired(schema, defaults, schema)).toEqual([]);
  });

  it('finds missing required entries in referenced array item schemas', () => {
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {$ref: '#/$defs/item'},
        },
      },
      $defs: {
        item: {
          type: 'object',
          additionalProperties: false,
          required: ['label'],
          properties: {
            label: {type: 'string'},
            size: {type: 'number'},
          },
        },
      },
    };
    const defaults = {
      items: [
        {
          label: 'one',
          size: 50,
        },
      ],
    };

    expect(findDefaultKeysMissingRequired(schema, defaults, schema)).toEqual(['items.[].size']);
  });
});
