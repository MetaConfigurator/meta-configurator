import {describe, expect, it, vi} from 'vitest';
import type {Path} from '../path';
import {
  arePathsEqual,
  asciiToPath,
  dataPathToSchemaPath,
  getParentElementRequiredPropsPath,
  jsonPointerToPath,
  jsonPointerToPathTyped,
  pathToAscii,
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

    const jsonPointer3 = '/3/foo/bar';
    const expectedResult3 = [3, 'foo', 'bar'];
    expect(jsonPointerToPathTyped(jsonPointer3)).toEqual(expectedResult3);
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

  it('should correctly detect convert from path to ascii and then back', () => {
    const pathRoot: Path = [];
    const expectedResultRoot = 'root';
    const asciiRoot = pathToAscii(pathRoot);
    expect(asciiRoot).toEqual(expectedResultRoot);
    expect(asciiToPath(asciiRoot)).toEqual(pathRoot);

    const path: Path = ['properties', 'foo', 0, 'bar'];
    const expectedResult = '%2Fproperties%2Ffoo%2F0%2Fbar';
    const ascii = pathToAscii(path);
    expect(ascii).toEqual(expectedResult);
    expect(asciiToPath(ascii)).toEqual(path);

    const path2: Path = ['person1', 'name', 'Alex'];
    const expectedResult2 = '%2Fperson1%2Fname%2FAlex';
    const ascii2 = pathToAscii(path2);
    expect(ascii2).toEqual(expectedResult2);
    expect(asciiToPath(ascii2)).toEqual(path2);
  });
});
