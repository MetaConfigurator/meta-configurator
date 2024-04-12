import {describe, expect, it, vi} from 'vitest';
import {DataConverterJson, DataConverterYaml} from '../dataConverter';

// Basic test for DataConverterYaml and methods of the abstract superclass
describe('DataConverter', () => {
  const dataConverter = new DataConverterYaml();
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

// Small test for the concrete JSON implementation
describe('DataConverterJson', () => {
  const dataConverter = new DataConverterJson();

  it('should parse data', () => {
    const data = `{"key": "value"}`;
    expect(dataConverter.parse(data)).toEqual({key: 'value'});
  });
  it('should stringify data', () => {
    const data = {key: 'value'};
    expect(dataConverter.stringify(data)).toContain(`"key": "value"`);
  });
  it('should handle undefined', () => {
    const data = undefined;
    expect(dataConverter.stringify(data)).toEqual('');
  });
});
