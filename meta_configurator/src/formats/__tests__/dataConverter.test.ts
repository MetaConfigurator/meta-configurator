import {describe, expect, it, vi} from 'vitest';
import {DataConverterYaml} from '../dataConverter';

// Test for the DataConverter super class
// We do not test the concrete implementations here, as they just use the methods from the libraries,
// which should be tested by the library itself.
// We use the DataConverterYaml as an example here to test the super class methods.

const dataConverter = new DataConverterYaml();

describe('DataConverter', () => {
  it('should parse data', () => {
    const data = `key: value`;
    expect(dataConverter.parse(data)).toEqual({key: 'value'});
  });
  it('should stringify data', () => {
    const data = {key: 'value'};
    expect(dataConverter.stringify(data)).toContain(`key: value`);
  });
  it('should check if data is valid', () => {
    const validData = `key: value`;
    const invalidData = `key: value:`;
    expect(dataConverter.isValidSyntax(validData)).toBeTruthy();
    expect(dataConverter.isValidSyntax(invalidData)).toBeFalsy();
  });
  it('should parse data if valid', () => {
    const data = `key: value`;
    const callback = vi.fn();
    dataConverter.parseIfValid(data, callback);
    expect(callback).toHaveBeenCalledWith({key: 'value'});
  });
  it('should not parse data if invalid', () => {
    const data = `key: value:`;
    const callback = vi.fn();
    dataConverter.parseIfValid(data, callback);
    expect(callback).not.toHaveBeenCalled();
  });
});
