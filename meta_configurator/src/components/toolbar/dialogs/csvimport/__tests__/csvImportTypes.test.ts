import {describe, expect, it} from 'vitest';
import {ref} from 'vue';
import {CsvImportColumnMappingData} from '@/components/toolbar/dialogs/csvimport/csvImportTypes';

describe('CsvImportColumnMappingData', () => {
  it('getPathForJsonDocument produces a typed path with correct segments', () => {
    const pathBeforeRowIndex = ref('items');
    const column = new CsvImportColumnMappingData(0, 'First Name', pathBeforeRowIndex);
    // pathAfterRowIndex is initialised from stringToIdentifier(name) → 'first_name'

    const path = column.getPathForJsonDocument(3);

    expect(path).toEqual(['items', 3, 'first_name']);
  });

  it('getTablePathForJsonDocument produces a typed path with the correct table segment', () => {
    const pathBeforeRowIndex = ref('measurements');
    const column = new CsvImportColumnMappingData(0, 'value', pathBeforeRowIndex);

    const path = column.getTablePathForJsonDocument();

    expect(path).toEqual(['measurements']);
  });

  it('getTablePathForJsonDocument reflects changes to the shared pathBeforeRowIndex ref', () => {
    const pathBeforeRowIndex = ref('first');
    const column = new CsvImportColumnMappingData(0, 'col', pathBeforeRowIndex);

    pathBeforeRowIndex.value = 'updated';
    const path = column.getTablePathForJsonDocument();

    expect(path).toEqual(['updated']);
  });

  it('getPathForJsonDocument reflects changes to the pathAfterRowIndex ref', () => {
    const pathBeforeRowIndex = ref('root');
    const column = new CsvImportColumnMappingData(0, 'col', pathBeforeRowIndex);

    column.pathAfterRowIndex.value = 'custom_field';
    const path = column.getPathForJsonDocument(0);

    expect(path).toEqual(['root', 0, 'custom_field']);
  });
});
