import {describe, expect, it, vi} from 'vitest';
import {findMatchingPaths} from '../findMatchingPaths';

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

describe('test path matching', () => {
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

  it('all matching paths should successfully be found, starting with a simple path without an array index', () => {
    // test the year path
    const sourcePathDef = '/year';
    const expectedPaths = [['year']];
    const result = findMatchingPaths(inputData, sourcePathDef);
    expect(result).toEqual(expectedPaths);
  });

  it('all matching paths should successfully be found, handling a single array index', () => {
    // test the street path
    const sourcePathDef = '/people/%INDEX%/address/street';
    const expectedPaths = [
      ['people', 0, 'address', 'street'],
      ['people', 1, 'address', 'street'],
    ];
    const result = findMatchingPaths(inputData, sourcePathDef);
    expect(result).toEqual(expectedPaths);

    // test the books path
    const sourcePathDef2 = '/books/%INDEX%/title';
    const expectedPaths2 = [
      ['books', 0, 'title'],
      ['books', 1, 'title'],
    ];
    const result2 = findMatchingPaths(inputData, sourcePathDef2);
    expect(result2).toEqual(expectedPaths2);
  });

  it('all matching paths should successfully be found, handling nested array indices', () => {
    // test the hobbies path
    const sourcePathDef = '/people/%INDEX%/hobbies/%INDEX%';
    const expectedPaths = [
      ['people', 0, 'hobbies', 0],
      ['people', 0, 'hobbies', 1],
      ['people', 1, 'hobbies', 0],
      ['people', 1, 'hobbies', 1],
    ];
    const result = findMatchingPaths(inputData, sourcePathDef);
    expect(result).toEqual(expectedPaths);
  });

  it('the path matching should also support %INDEX_A% to %INDEX_Z% by treating it as %INDEX%', () => {
    // test the hobbies path, now using %INDEX_A% and %INDEX_Z%
    const sourcePathDef = '/people/%INDEX_A%/hobbies/%INDEX_Z%';
    const expectedPaths = [
      ['people', 0, 'hobbies', 0],
      ['people', 0, 'hobbies', 1],
      ['people', 1, 'hobbies', 0],
      ['people', 1, 'hobbies', 1],
    ];
    const result = findMatchingPaths(inputData, sourcePathDef);
    expect(result).toEqual(expectedPaths);
  });
});
