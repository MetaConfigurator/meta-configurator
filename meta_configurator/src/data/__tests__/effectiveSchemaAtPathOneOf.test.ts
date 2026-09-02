/**
 * Regression test for the zooming bug where effectiveSchemaAtPath did not correctly
 * resolve oneOf selections: when a oneOf selection was made, only the selected
 * sub-schema was used and all sibling keywords of the oneOf (e.g. shared properties)
 * were lost while zooming into such a node.
 */
import {beforeAll, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {installWorkerTestDouble} from '@/data/__tests__/managedValidationTestUtils';

installWorkerTestDouble();

vi.mock('@/data/managedValidation', async () => {
  const {createManagedValidationModuleTestDouble} = await import(
    '@/data/__tests__/managedValidationTestUtils'
  );
  return createManagedValidationModuleTestDouble();
});

let SessionMode: any;
let useDataSource: any;
let getSchemaForMode: any;
let getDataForMode: any;
let getUserSelectionForMode: any;
let OneOfAnyOfSelectionOption: any;

beforeAll(async () => {
  setActivePinia(createPinia());
  SessionMode = (await import('@/store/sessionMode')).SessionMode;
  useDataSource = (await import('@/data/dataSource')).useDataSource;
  const dataLink = await import('@/data/useDataLink');
  getSchemaForMode = dataLink.getSchemaForMode;
  getDataForMode = dataLink.getDataForMode;
  getUserSelectionForMode = dataLink.getUserSelectionForMode;
  OneOfAnyOfSelectionOption = (await import('@/data/oneOfAnyOfSelectionOption'))
    .OneOfAnyOfSelectionOption;

  useDataSource().userSchemaData.value = {
    type: 'object',
    properties: {
      pet: {
        type: 'object',
        properties: {
          name: {type: 'string'},
        },
        oneOf: [
          {title: 'Dog', properties: {bark: {type: 'boolean'}}},
          {title: 'Cat', properties: {meow: {type: 'boolean'}}},
        ],
      },
    },
  };
  getSchemaForMode(SessionMode.DataEditor).reloadSchema();
  getDataForMode(SessionMode.DataEditor).setData({pet: {name: 'Rex'}});
});

describe('effectiveSchemaAtPath with a oneOf selection', () => {
  it('merges the selected oneOf sub-schema with its base schema', () => {
    const mode = SessionMode.DataEditor;
    getUserSelectionForMode(mode).setSelectedOneOfOption(
      ['pet'],
      new OneOfAnyOfSelectionOption('Dog', 0)
    );

    const effectiveSchema = getSchemaForMode(mode).effectiveSchemaAtPath(['pet']);
    const propertyNames = Object.keys(effectiveSchema.schema.properties);

    // property of the selected oneOf option
    expect(propertyNames).toContain('bark');
    // shared property defined next to the oneOf must not be lost
    expect(propertyNames).toContain('name');
    // property of the other, unselected option must not appear
    expect(propertyNames).not.toContain('meow');

    // resolving a shared property through the oneOf node must work as well
    const nameSchema = getSchemaForMode(mode).effectiveSchemaAtPath(['pet', 'name']);
    expect(nameSchema.schema.hasType('string')).toBe(true);
  });
});
