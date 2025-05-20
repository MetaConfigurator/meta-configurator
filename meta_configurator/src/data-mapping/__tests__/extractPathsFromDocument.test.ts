import {describe, expect, it, vi} from 'vitest';
import {
  extractInvalidSourcePathsFromConfig,
  extractSourcePaths,
  extractSuitableSourcePaths,
} from '../extractPathsFromDocument';
import type {DataMappingConfig} from '../dataMappingTypes';

// avoid constructing useDataLink store through imports, it is not required for this component
vi.mock('@/data/useDataLink', () => ({
  getSchemaForMode: vi.fn(),
  getDataForMode: vi.fn(),
  useCurrentData: vi.fn(),
  useCurrentSchema: vi.fn(),
  getUserSelectionForMode: vi.fn(),
  getValidationForMode: vi.fn(),
  getSessionForMode: vi.fn(),
}));

describe('test extraction of suitable source paths for data mapping', () => {
  const inputData = {
    people: [
      {
        name: 'John Doe',
        age: 30,
        address: {
          street: '123 Main St',
          city: 'Anytown',
          zip: '12345',
        },
        hobbies: ['reading', 'gaming'],
      },
      {
        name: 'Jane Smith',
        age: 25,
        address: {
          street: '456 Elm St',
          city: 'Othertown',
          zip: '67890',
        },
        hobbies: ['cooking', 'traveling'],
      },
    ],
    books: [
      {
        title: 'Book 1',
      },
      {
        title: 'Book 2',
      },
    ],
    year: 2050,
  };

  const mappingConfig: DataMappingConfig = {
    // note that only values get copied for which exists a mapping. Map all values except the address
    mappings: [
      {
        sourcePath: '/people/%INDEX_A%/name',
        targetPath: '/person/%INDEX_A%/fullName',
      },
      {
        sourcePath: '/people/%INDEX_A%/age',
        targetPath: '/person/%INDEX_A%/age',
      },
      {
        sourcePath: '/books/%INDEX_A%/title',
        targetPath: '/library/%INDEX_A%/bookTitle',
      },
      // note that the hobby mappings do not correspond to the input data, as they are objects and not just simple strings
      {
        sourcePath: '/people/%INDEX_A%/hobbies/%INDEX_B%/name',
        targetPath: '/person/%INDEX_A%/activities/%INDEX_B%/hobbyName',
      },
      {
        sourcePath: '/people/%INDEX_A%/hobbies/%INDEX_B%/type',
        targetPath: '/person/%INDEX_A%/activities/%INDEX_B%/hobbyType',
      },
      {
        sourcePath: '/year',
        targetPath: '/year',
      },
    ],
    transformations: [
      {
        operationType: 'mathFormula',
        sourcePath: '/people/%INDEX_A%/age',
        formula: 'x + 1',
      },
      {
        operationType: 'stringOperation',
        sourcePath: '/people/%INDEX_A%/name',
        string: 'uppercase',
      },
      {
        operationType: 'valueMapping',
        sourcePath: '/books/%INDEX_A%/title',
        valueMapping: {
          'Book 1': 'First Book',
          'Book 2': 'Second Book',
        },
      },
    ],
  };

  it('test extraction of suitable source paths', () => {
    const suitableSourcePaths = extractSuitableSourcePaths(inputData);
    const expectedSourcePaths = [
      '/people/%INDEX_A%/name',
      '/people/%INDEX_A%/age',
      '/people/%INDEX_A%/address/street',
      '/people/%INDEX_A%/address/city',
      '/people/%INDEX_A%/address/zip',
      '/people/%INDEX_A%/hobbies/%INDEX_B%',
      '/books/%INDEX_A%/title',
      '/year',
    ];
    expect(suitableSourcePaths).toEqual(expectedSourcePaths);
  });

  it('test extraction of actual source paths from mapping config', () => {
    const actualSourcePaths = extractSourcePaths(mappingConfig);
    const expectedSourcePaths = [
      '/people/%INDEX_A%/name',
      '/people/%INDEX_A%/age',
      '/books/%INDEX_A%/title',
      '/people/%INDEX_A%/hobbies/%INDEX_B%/name',
      '/people/%INDEX_A%/hobbies/%INDEX_B%/type',
      '/year',
    ];
    expect(actualSourcePaths).toEqual(expectedSourcePaths);
  });

  it('test that invalid source paths in config are properly detected', () => {
    const invalidSourcePaths = extractInvalidSourcePathsFromConfig(mappingConfig, inputData);
    const expectedInvalidSourcePaths = [
      '/people/%INDEX_A%/hobbies/%INDEX_B%/name',
      '/people/%INDEX_A%/hobbies/%INDEX_B%/type',
    ];
    expect(invalidSourcePaths).toEqual(expectedInvalidSourcePaths);
  });
});
