import {describe, expect, it, vi} from 'vitest';
import type {Path} from '../path';
import {
  arePathsEqual,
  dataPathToSchemaPath,
  getParentElementRequiredPropsPath,
  jsonPointerToPath,
  jsonPointerToPathTyped,
  pathToJsonPointer,
  pathToString,
} from '../pathUtils';
import {dataAt} from '../resolveDataAtPath';

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

describe('test pathUtils', () => {
  it('should correctly convert from path to string', () => {
    const pathRoot: Path = [];
    const expectedResultRoot = '';
    expect(pathToString(pathRoot)).toEqual(expectedResultRoot);

    const path: Path = ['properties', 'foo', 0, 'bar'];
    const expectedResult = 'properties.foo[0].bar';
    expect(pathToString(path)).toEqual(expectedResult);

    const path2: Path = ['properties', 'foo', 'bar'];
    const expectedResult2 = 'properties.foo.bar';
    expect(pathToString(path2)).toEqual(expectedResult2);
  });

  it('should correctly convert from path to json pointer', () => {
    const pathRoot: Path = [];
    const expectedResultRoot = '';
    expect(pathToJsonPointer(pathRoot)).toEqual(expectedResultRoot);

    const path: Path = ['properties', 'foo', 0, 'bar'];
    const expectedResult = '/properties/foo/0/bar';
    expect(pathToJsonPointer(path)).toEqual(expectedResult);

    const path2: Path = ['properties', 'foo', 'bar'];
    const expectedResult2 = '/properties/foo/bar';
    expect(pathToJsonPointer(path2)).toEqual(expectedResult2);
  });

  it('should correctly convert from json pointer to path (without using numbers for array index)', () => {
    const jsonPointerRoot = '';
    const expectedResultRoot: Path = [];
    expect(jsonPointerToPath(jsonPointerRoot)).toEqual(expectedResultRoot);

    const jsonPointer = '/properties/foo/0/bar';
    const expectedResult = ['properties', 'foo', '0', 'bar'];
    expect(jsonPointerToPath(jsonPointer)).toEqual(expectedResult);

    const jsonPointer2 = '/properties/foo/bar';
    const expectedResult2 = ['properties', 'foo', 'bar'];
    expect(jsonPointerToPath(jsonPointer2)).toEqual(expectedResult2);
  });

  it('should correctly convert from json pointer to typed path (with using numbers for array index)', () => {
    const jsonPointerRoot = '';
    const expectedResultRoot: Path = [];
    expect(jsonPointerToPathTyped(jsonPointerRoot)).toEqual(expectedResultRoot);

    const jsonPointer = '/properties/foo/0/bar';
    const expectedResult = ['properties', 'foo', 0, 'bar'];
    expect(jsonPointerToPathTyped(jsonPointer)).toEqual(expectedResult);

    const jsonPointer2 = '/properties/foo/bar';
    const expectedResult2 = ['properties', 'foo', 'bar'];
    expect(jsonPointerToPathTyped(jsonPointer2)).toEqual(expectedResult2);
  });

  it('should correctly convert from data path to schema path', () => {
    const dataPathRoot: Path = [];
    const expectedResultRoot: Path = [];
    expect(dataPathToSchemaPath(dataPathRoot)).toEqual(expectedResultRoot);

    const dataPath: Path = ['foo', 0, 'bar'];
    const expectedResult = ['properties', 'foo', 'items', 'properties', 'bar'];
    expect(dataPathToSchemaPath(dataPath)).toEqual(expectedResult);

    const dataPath2: Path = ['foo', 'bar'];
    const expectedResult2 = ['properties', 'foo', 'properties', 'bar'];
    expect(dataPathToSchemaPath(dataPath2)).toEqual(expectedResult2);
  });

  it('should correctly get the path to the list of required properties of the parent object based on the property path, from the schema document', () => {
    const schema = {
      properties: {
        foo: {
          type: 'object',
          required: ['bar'],
          properties: {
            bar: {
              type: 'string',
            },
          },
        },
      },
    };
    const path = ['properties', 'foo', 'properties', 'bar'];
    const expectedResult = ['properties', 'foo', 'required'];
    const requiredProps = getParentElementRequiredPropsPath(schema, path);
    expect(requiredProps).toEqual(expectedResult);
  });

  it('should correctly detect whether to paths are equal', () => {
    const path1 = ['properties', 'foo', 'properties', 'bar'];
    const path2 = ['properties', 'foo', 'properties', 'bar'];
    const expectedResult = true;
    expect(arePathsEqual(path1, path2)).toEqual(expectedResult);

    // test with path where last element is different
    const path3 = ['properties', 'foo', 'properties', 'baz'];
    const expectedResult2 = false;
    expect(arePathsEqual(path1, path3)).toEqual(expectedResult2);

    // test with path which has more elements
    const path4 = ['properties', 'foo', 'properties', 'bar', 'baz'];
    const expectedResult3 = false;
    expect(arePathsEqual(path1, path4)).toEqual(expectedResult3);
  });
});
