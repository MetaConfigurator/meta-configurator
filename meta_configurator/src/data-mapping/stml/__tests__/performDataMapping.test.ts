import {describe, expect, it, vi} from 'vitest';
import {type DataMappingConfig} from '../dataMappingTypes';
import {performSimpleDataMapping} from '../performDataMapping';

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

describe('test performing data mappings on a given input file, based on a mapping configuration', () => {
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
        hobbies: [
          {
            name: 'reading',
            type: 'indoor',
          },
          {
            name: 'gaming',
            type: 'indoor',
          },
        ],
      },
      {
        name: 'Jane Smith',
        age: 25,
        address: {
          street: '456 Elm St',
          city: 'Othertown',
          zip: '67890',
        },
        hobbies: [
          {
            name: 'cooking',
            type: 'indoor',
          },
          {
            name: 'traveling',
            type: 'outdoor',
          },
        ],
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
        operationType: 'function',
        sourcePath: '/people/%INDEX_A%/age',
        function: 'x + 1',
      },
      {
        operationType: 'function',
        sourcePath: '/people/%INDEX_A%/name',
        function: 'x.toUpperCase()',
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

  it('test the complete mapping', () => {
    const result = performSimpleDataMapping(inputData, mappingConfig);

    expect(result).toEqual({
      person: [
        {
          fullName: 'JOHN DOE',
          age: 31,
          activities: [
            {
              hobbyName: 'reading',
              hobbyType: 'indoor',
            },
            {
              hobbyName: 'gaming',
              hobbyType: 'indoor',
            },
          ],
        },
        {
          fullName: 'JANE SMITH',
          age: 26,
          activities: [
            {
              hobbyName: 'cooking',
              hobbyType: 'indoor',
            },
            {
              hobbyName: 'traveling',
              hobbyType: 'outdoor',
            },
          ],
        },
      ],
      library: [
        {
          bookTitle: 'First Book',
        },
        {
          bookTitle: 'Second Book',
        },
      ],
      year: 2050,
    });
  });

  it('test the data mapping for a scenario where not all array elements have all expected fields to be mapped', () => {
    // create copy of input data and modify it, removing name of first hobby of John and age of Jane
    // also remove full book list
    const modifiedInputData = JSON.parse(JSON.stringify(inputData));
    delete modifiedInputData.people[0].hobbies[0].name;
    delete modifiedInputData.people[1].age;
    delete modifiedInputData.books;

    const result = performSimpleDataMapping(modifiedInputData, mappingConfig);

    // expect all data was mapped properly and the missing fields simply ignored
    expect(result).toEqual({
      person: [
        {
          fullName: 'JOHN DOE',
          age: 31,
          activities: [
            {
              hobbyType: 'indoor',
            },
            {
              hobbyName: 'gaming',
              hobbyType: 'indoor',
            },
          ],
        },
        {
          fullName: 'JANE SMITH',
          activities: [
            {
              hobbyName: 'cooking',
              hobbyType: 'indoor',
            },
            {
              hobbyName: 'traveling',
              hobbyType: 'outdoor',
            },
          ],
        },
      ],
      year: 2050,
    });
  });
});

// there used to be a bug that for a target array at root level the array indexes are confused for object keys
describe('test performing data mappings when the root element is an array', () => {
  const inputDataArrayRoot = [
    {
      name: 'John Doe',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Anytown',
        zip: '12345',
      },
    },
    {
      name: 'Jane Smith',
      age: 25,
      address: {
        street: '456 Elm St',
        city: 'Othertown',
        zip: '67890',
      },
    },
  ];

  const mappingConfigArrayRoot: DataMappingConfig = {
    mappings: [
      {
        sourcePath: '/%INDEX_A%/name',
        targetPath: '/%INDEX_A%/fullName',
      },
      {
        sourcePath: '/%INDEX_A%/age',
        targetPath: '/%INDEX_A%/age',
      },
    ],
    transformations: [],
  };

  it('test the complete mapping with array root', () => {
    const result = performSimpleDataMapping(inputDataArrayRoot, mappingConfigArrayRoot);

    expect(result).toEqual([
      {
        fullName: 'John Doe',
        age: 30,
      },
      {
        fullName: 'Jane Smith',
        age: 25,
      },
    ]);
  });
});
