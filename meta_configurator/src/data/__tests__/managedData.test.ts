import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowRef, triggerRef} from 'vue';
import {ManagedData} from '../managedData';

vi.mock('@/formats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('ManagedData', () => {
  let dataLink: ManagedData;

  beforeEach(() => {
    const testDataRef = shallowRef({
      test: 'value',
      nested: {test: 'value'},
    });
    dataLink = new ManagedData(testDataRef);
  });

  it('should correctly setup the data', () => {
    expect(dataLink.data.value).toEqual({
      test: 'value',
      nested: {test: 'value'},
    });
  });

  it('should correctly calculate the unparsedData', () => {
    expect(dataLink.unparsedData.value).toEqual(`{"test":"value","nested":{"test":"value"}}`);
  });

  it('should correctly update the data when the unparsedData is updated', () => {
    dataLink.unparsedData.value = `{"test":"newValue","nested":{"test":"newValue"}}`;
    expect(dataLink.data.value).toEqual({
      test: 'newValue',
      nested: {test: 'newValue'},
    });
  });

  it('should correctly update the unparsedData when the data is updated', () => {
    dataLink.data.value = {
      test: 'value2',
      nested: {test: 'value2'},
    };
    expect(dataLink.unparsedData.value).toEqual(`{"test":"value2","nested":{"test":"value2"}}`);
  });

  it('should correctly handle invalid data', () => {
    dataLink.unparsedData.value = `{"test":"value2","nested":{"test":"value2"}`; // missing closing bracket
    expect(dataLink.data.value).toEqual({
      test: 'value',
      nested: {test: 'value'},
    });
    expect(dataLink.unparsedData.value).toEqual(`{"test":"value2","nested":{"test":"value2"}`);
  });

  it('should update the data when the data is updated via updateData', () => {
    dataLink.updateData(data => {
      data.test = 'newValue';
    });
    expect(dataLink.data.value).toEqual({
      test: 'newValue',
      nested: {test: 'value'},
    });
  });

  it('should update the unparsedData when the data is updated via updateData', () => {
    // force calculation of unparsedData once (computed properties are lazy)
    expect(dataLink.unparsedData.value).toEqual(`{"test":"value","nested":{"test":"value"}}`);

    // now update the data
    dataLink.updateData(data => {
      data.nested.test = 'newValue';
    });
    expect(dataLink.unparsedData.value).toEqual(`{"test":"value","nested":{"test":"newValue"}}`);
  });

  it('should update the unparsedData when the shallowRef is updated externally', () => {
    // force calculation of unparsedData once (computed properties are lazy)
    expect(dataLink.unparsedData.value).toEqual(`{"test":"value","nested":{"test":"value"}}`);

    dataLink.shallowDataRef.value.nested.test = 'newValue';
    triggerRef(dataLink.shallowDataRef);
    expect(dataLink.unparsedData.value).toEqual(`{"test":"value","nested":{"test":"newValue"}}`);
  });
});
