import {describe, expect, it, vi} from 'vitest';
import {applyTransformations} from '../applyTransformations';
import {type Transformation} from '../dataMappingTypes';

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

describe('test transformations for data mapping', () => {
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

  const transformations: Transformation[] = [
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
  ];

  it('test transformation using the mathFormula operator', () => {
    const outputData = applyTransformations(inputData, transformations);
    expect(outputData.people[0].age).toEqual(31);
    expect(outputData.people[1].age).toEqual(26);
  });

  it('test transformation using the stringOperation operator', () => {
    const outputData = applyTransformations(inputData, transformations);
    expect(outputData.people[0].name).toEqual('JOHN DOE');
    expect(outputData.people[1].name).toEqual('JANE SMITH');
  });

  it('test transformation using the valueMapping operator', () => {
    const outputData = applyTransformations(inputData, transformations);
    expect(outputData.books[0].title).toEqual('First Book');
    expect(outputData.books[1].title).toEqual('Second Book');
  });
});
