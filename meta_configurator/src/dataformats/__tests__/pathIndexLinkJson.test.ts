import {describe, expect, it, vi} from 'vitest';
import {PathIndexLinkJson} from '../pathIndexLinkJson';
import type {Path} from '../../utility/path';

vi.mock('@/main', () => ({
  errorService: {},
}));

describe('pathIndexLinkJson', () => {
  const pathIndexLinkJson = new PathIndexLinkJson();

  describe('determineIndexOfPath', () => {
    describe('when accessing simple object properties', () => {
      it('should return the correct index of number property', () => {
        const data = `{\n\t"a": 1\n}`;
        const indexAfter1 = 9;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['a'])).toBe(indexAfter1);
      });
      it('should return the correct index of string property', () => {
        const data = `{\n\t"b": "test"\n}`;
        const indexBeforeSecondQuote = 13;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['b'])).toBe(indexBeforeSecondQuote);
      });
      it('should return the correct index of boolean property', () => {
        const data = `{\n\t"c": true\n}`;
        const indexAfterTrue = 12;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['c'])).toBe(indexAfterTrue);
      });
      it('should return the correct index of null property', () => {
        const data = `{\n\t"d": null\n}`;
        const indexAfterNull = 12;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['d'])).toBe(indexAfterNull);
      });
      it('should return the index of the parent element if the property is not found', () => {
        const data = `{\n\t"e": 1\n}`;
        const indexAfter1 = 9;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['f'])).toBe(indexAfter1);
      });
    });

    describe('when accessing nested object properties', () => {
      it('should return the correct index of empty object property', () => {
        const data = `{"e": {}}`;
        const indexInsideObject = 7;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['e'])).toBe(indexInsideObject);
      });
      it('should return the correct index of nested object property', () => {
        const data = `{"f": {"g": 1}}`;
        const indexAtEndOfNestedObject = 13;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['f'])).toBe(indexAtEndOfNestedObject);
      });
      it('should return the correct index of nested property with formatting', () => {
        const data = `{ "f":\n\t\t { "g": 1 \n\t\t }}`;
        const indexAfterLastProperty = 18;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['f'])).toBe(indexAfterLastProperty);
      });
      it('should return the correct index of deeply nested object property', () => {
        const data = `{"h": {"i": {"unrelated": 3, "j": 1, "other": 2}}}`;
        const indexAtEndOfDeeplyNestedObject = 48;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['h'])).toBe(
          indexAtEndOfDeeplyNestedObject
        );
      });
      it('should return the correct index of an array', () => {
        const data = `{"k": [1, 2, 3]}`;
        const indexAtEndOfArray = 14;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['k'])).toBe(indexAtEndOfArray);
      });
      it('should return the correct index of an array with formatting', () => {
        const data = `{"k": [ 1, \n\t2, 3 \n\t\t ]}`;
        const indexAfterLastElement = 17;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['k'])).toBe(indexAfterLastElement);
      });
    });

    describe('when accessing deeply nested properties', () => {
      it('should determine the correct index in nested objects', () => {
        const data = `{"test": {"a": {"b": {"c": "test2", "d": "test3", "e": "test4"}}}}`;
        const indexAfterTest3 = 47;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['test', 'a', 'b', 'd'])).toBe(
          indexAfterTest3
        );
      });
      it('should determine the correct index in nested arrays', () => {
        const data = `[1, 2, [3, 4, ["test", "test2", "test3"]]]`;
        const indexAfterTest2 = 29;
        expect(pathIndexLinkJson.determineIndexOfPath(data, [2, 2, 1])).toBe(indexAfterTest2);
      });
      it('should determine the correct index in nested objects and arrays', () => {
        const data = `{"test": {"a": [1, 2, {"b": {"c": [null, true, "test"]}}]}}`;
        const indexAfterNull = 39;
        expect(pathIndexLinkJson.determineIndexOfPath(data, ['test', 'a', 2, 'b', 'c', 0])).toBe(
          indexAfterNull
        );
      });
      it('should determine the correct index in nested arrays and objects in formatted JSON', () => {
        const data = `{"test": {"a": [1, 2, {"b": {"c": [null, true, "test"]}}]}}`;
        const formattedData = JSON.stringify(JSON.parse(data), null, 2);
        const indexAfterNull = 99;
        expect(
          pathIndexLinkJson.determineIndexOfPath(formattedData, ['test', 'a', 2, 'b', 'c', 0])
        ).toBe(indexAfterNull);
      });
    });
  });

  describe('determinePathFromIndex', () => {
    describe('accessing properties', () => {
      it('should return the correct path for the index at the first quote', () => {
        const data = `{\n\t"a": "test"\n}`;
        const indexAtFirstQuote = 3;
        const expectedPath: Path = ['a'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtFirstQuote)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path for the index at the last quote', () => {
        const data = `{\n\t"a": "test"\n}`;
        const indexAtLastQuote = 13;
        const expectedPath: Path = ['a'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtLastQuote)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path for the index at the comma between properties', () => {
        const data = `{"a": "test","b": "test2"}`;
        const indexAtComma = 14;
        const expectedPath: Path = ['a'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtComma)).toEqual(expectedPath);
      });
    });
    describe('accessing nested properties', () => {
      it('should return the correct path for the index before the nested property', () => {
        const data = `{\n\t"a": {"b": "test"}\n}`;
        const indexBeforeNestedProperty = 8;
        const expectedPath: Path = ['a'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexBeforeNestedProperty)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path for the index at the nested property', () => {
        const data = `{\n\t"a": {"b": "test"}\n}`;
        const indexAtNestedProperty = 9;
        const expectedPath: Path = ['a', 'b'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtNestedProperty)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path for the index at the end of the nested property', () => {
        const data = `{\n\t"a": {"b": "test"}\n}`;
        const indexAtEndOfNestedProperty = 20;
        const expectedPath: Path = ['a', 'b'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtEndOfNestedProperty)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path for the index after the nested property', () => {
        const data = `{\n\t"a": {"b": "test"}\n}`;
        const indexAfterNestedProperty = 21;
        const expectedPath: Path = ['a'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAfterNestedProperty)).toEqual(
          expectedPath
        );
      });
    });
    describe('accessing array elements', () => {
      it('should return the correct path for the index before the bracket', () => {
        const data = `{\n\t"a": ["test", "test2"]\n}`;
        const indexBeforeBracket = 7;
        const expectedPath: Path = ['a'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexBeforeBracket)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path for the index at the first bracket', () => {
        const data = `{\n\t"a": ["test", "test2"]\n}`;
        const indexAtFirstBracket = 8;
        const expectedPath: Path = ['a'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtFirstBracket)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path for the index at the first element', () => {
        const data = `{\n\t"a": ["test", "test2"]\n}`;
        const indexAtFirstElement = 9;
        const expectedPath: Path = ['a', 0];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtFirstElement)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path for the index at the comma between elements', () => {
        const data = `{\n\t"a": ["test", "test2"]\n}`;
        const indexAtComma = 15;
        const expectedPath: Path = ['a', 0];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtComma)).toEqual(expectedPath);
      });
      it('should return the correct path for the index at the second element', () => {
        const data = `{\n\t"a": ["test", "test2"]\n}`;
        const indexAtSecondElement = 17;
        const expectedPath: Path = ['a', 1];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtSecondElement)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path for the index after the closing bracket', () => {
        const data = `{\n\t"a": ["test", "test2"]\n}`;
        const indexAtClosingBracket = 25;
        const expectedPath: Path = ['a'];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtClosingBracket)).toEqual(
          expectedPath
        );
      });
      it('should return the correct path in a deeply nested array/objects', () => {
        const data = `{\n\t"a": {"b": [1, 2, {"c": [null, true, "test"]}]}\n}`;
        const indexAtNull = 28;
        const expectedPath: Path = ['a', 'b', 2, 'c', 0];
        expect(pathIndexLinkJson.determinePathFromIndex(data, indexAtNull)).toEqual(expectedPath);
      });
    });
  });
});
