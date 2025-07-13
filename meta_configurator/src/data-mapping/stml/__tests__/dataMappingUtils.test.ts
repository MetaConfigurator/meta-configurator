import {describe, expect, it, vi} from 'vitest';
import {normalizeJsonPointer, pathToNormalizedJsonPointer} from '../dataMappingUtilsStml';

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

describe('test data mapping utils', () => {
  it('test pathToNormalizedJsonPointer', () => {
    const path1 = ['people', 0, 'name'];
    const expectedPointer1 = '/people/%INDEX_A%/name';
    const result1 = pathToNormalizedJsonPointer(path1, true);
    expect(result1).toEqual(expectedPointer1);

    const path2 = ['people', 10, 'address', 'street'];
    const expectedPointer2 = '/people/%INDEX_A%/address/street';
    const result2 = pathToNormalizedJsonPointer(path2, true);
    expect(result2).toEqual(expectedPointer2);

    // example with multiple indices
    const path3 = ['people', 5, 'hobbies', 4];
    const expectedPointer3 = '/people/%INDEX_A%/hobbies/%INDEX_B%';
    const result3 = pathToNormalizedJsonPointer(path3, true);
    expect(result3).toEqual(expectedPointer3);

    // example where the replaceIndexByPlaceholder option is set false
    const path4 = ['people', 5, 'hobbies', 4];
    const expectedPointer4 = '/people/5/hobbies/4';
    const result4 = pathToNormalizedJsonPointer(path4, false);
    expect(result4).toEqual(expectedPointer4);
  });

  it('test normalizeJsonPointer', () => {
    const pointer1 = '/people/0/name';
    const expectedNormPointer1 = '/people/%INDEX_A%/name';
    const result1 = normalizeJsonPointer(pointer1, true);
    expect(result1).toEqual(expectedNormPointer1);

    const pointer2 = '/people/3/address/street';
    const expectedNormPointer2 = '/people/%INDEX_A%/address/street';
    const result2 = normalizeJsonPointer(pointer2, true);
    expect(result2).toEqual(expectedNormPointer2);

    // example with multiple indices
    const pointer3 = '/people/4/hobbies/0';
    const expectedNormPointer3 = '/people/%INDEX_A%/hobbies/%INDEX_B%';
    const result3 = normalizeJsonPointer(pointer3, true);
    expect(result3).toEqual(expectedNormPointer3);

    // example where the replaceIndexByPlaceholder option is set false
    const pointer4 = '/people/5/hobbies/4';
    const expectedNormPointer4 = '/people/5/hobbies/4';
    const result4 = normalizeJsonPointer(pointer4, false);
    expect(result4).toEqual(expectedNormPointer4);

    // example where the pointer starts with a hashtag
    const pointer5 = '#/people/0/name';
    const expectedNormPointer5 = '/people/%INDEX_A%/name';
    const result5 = normalizeJsonPointer(pointer5, true);
    expect(result5).toEqual(expectedNormPointer5);

    // example where the pointer starts without a slash
    const pointer6 = 'people/0/name';
    const expectedNormPointer6 = '/people/%INDEX_A%/name';
    const result6 = normalizeJsonPointer(pointer6, true);
    expect(result6).toEqual(expectedNormPointer6);
  });
});
