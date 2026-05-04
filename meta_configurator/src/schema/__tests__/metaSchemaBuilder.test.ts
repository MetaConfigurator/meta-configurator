import {describe, expect, it} from 'vitest';
import {buildMetaSchema} from '@/schema/metaSchemaBuilder';
import {ValidationService} from '@/schema/validationService';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import type {SettingsInterfaceMetaSchema} from '@/settings/settingsTypes';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';

function buildSettings(overrides: Partial<SettingsInterfaceMetaSchema> = {}) {
  return {
    ...structuredClone(SETTINGS_DATA_DEFAULT.metaSchema),
    ...overrides,
  };
}

function validateSchemaCandidate(
  settings: Partial<SettingsInterfaceMetaSchema>,
  schemaCandidate: TopLevelSchema
) {
  const metaSchema = buildMetaSchema(buildSettings(settings));
  const validationService = new ValidationService(metaSchema);
  return validationService.validate(schemaCandidate);
}

describe('metaSchemaBuilder', () => {
  describe('type validation with allowMultipleTypes disabled', () => {
    it('accepts all individual simple types', () => {
      const simpleTypes = ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string'];

      for (const type of simpleTypes) {
        const result = validateSchemaCandidate(
          {allowMultipleTypes: false},
          type === 'array'
            ? {type, items: {type: 'string'}}
            : type === 'object'
              ? {type, properties: {}}
              : {type}
        );

        expect(result.errors, `type ${type} should be valid`).toEqual([]);
      }
    });

    it('accepts nullable unions with exactly one non-null type', () => {
      const nullableTypes = ['array', 'boolean', 'integer', 'number', 'object', 'string'];

      for (const type of nullableTypes) {
        const schemaCandidate =
          type === 'array'
            ? {type: ['array', 'null'], items: {type: 'string'}}
            : type === 'object'
              ? {type: ['object', 'null'], properties: {}}
              : {type: [type, 'null']};

        const result = validateSchemaCandidate({allowMultipleTypes: false}, schemaCandidate);
        expect(result.errors, `nullable type ${type} should be valid`).toEqual([]);
      }
    });

    it('accepts nullable unions regardless of order', () => {
      const result = validateSchemaCandidate(
        {allowMultipleTypes: false},
        {type: ['null', 'string']}
      );

      expect(result.errors).toEqual([]);
    });

    it('rejects non-null multi-type unions', () => {
      const result = validateSchemaCandidate(
        {allowMultipleTypes: false},
        {type: ['string', 'number']}
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects unions with null and more than one non-null type', () => {
      const result = validateSchemaCandidate(
        {allowMultipleTypes: false},
        {type: ['string', 'number', 'null']}
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects duplicate nullable unions', () => {
      const result = validateSchemaCandidate(
        {allowMultipleTypes: false},
        {type: ['string', 'null', 'null']}
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('still rejects empty type arrays', () => {
      const result = validateSchemaCandidate(
        {allowMultipleTypes: false},
        {type: [] as unknown as TopLevelSchema['type']}
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('type validation with allowMultipleTypes enabled', () => {
    it('accepts unrestricted multi-type unions', () => {
      const result = validateSchemaCandidate(
        {allowMultipleTypes: true},
        {type: ['string', 'number']}
      );

      expect(result.errors).toEqual([]);
    });

    it('still accepts nullable unions', () => {
      const result = validateSchemaCandidate(
        {allowMultipleTypes: true},
        {type: ['string', 'null']}
      );

      expect(result.errors).toEqual([]);
    });

    it('still rejects duplicate type arrays', () => {
      const result = validateSchemaCandidate(
        {allowMultipleTypes: true},
        {type: ['string', 'string']}
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('boolean schema validation', () => {
    it('rejects nested boolean schemas when allowBooleanSchema is disabled', () => {
      const result = validateSchemaCandidate(
        {allowBooleanSchema: false},
        {
          type: 'object',
          properties: {
            maybeAnything: true,
          },
        }
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('accepts nested boolean schemas when allowBooleanSchema is enabled', () => {
      const result = validateSchemaCandidate(
        {allowBooleanSchema: true},
        {
          type: 'object',
          properties: {
            maybeAnything: true,
          },
        }
      );

      expect(result.errors).toEqual([]);
    });

  });

  describe('ordinary object schema validation', () => {
    it('accepts ordinary object schemas in simplified mode', () => {
      const result = validateSchemaCandidate(
        {
          allowBooleanSchema: false,
          allowMultipleTypes: false,
        },
        {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
          },
          required: ['name'],
        }
      );

      expect(result.errors).toEqual([]);
    });
  });
});
