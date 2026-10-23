import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowRef, triggerRef} from 'vue';
import {ManagedData} from '../managedData';
import {SessionMode} from '../../store/sessionMode';

vi.mock('@/dataformats/formatRegistry', () => ({
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
    dataLink = new ManagedData(testDataRef, SessionMode.DataEditor);
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

  it('should set data at nested paths, including array indices', () => {
    dataLink.setDataAt(['nested', 'test'], 'newValue');
    expect(dataLink.dataAt(['nested', 'test'])).toEqual('newValue');

    dataLink.setDataAt(['nested', 'list', 0], 'first');
    expect(dataLink.dataAt(['nested', 'list'])).toEqual(['first']);
  });

  it('should set data at paths starting with an array index (root-level arrays)', () => {
    const arrayData = new ManagedData(shallowRef(['a']), SessionMode.DataEditor);

    // appending a whole item at a root-level index was silently dropped before
    arrayData.setDataAt([1], 'b');
    expect(arrayData.data.value).toEqual(['a', 'b']);

    arrayData.setDataAt([0], {name: 'Alex'});
    expect(arrayData.data.value).toEqual([{name: 'Alex'}, 'b']);

    arrayData.setDataAt([0, 'name'], 'Bob');
    expect(arrayData.data.value).toEqual([{name: 'Bob'}, 'b']);
  });

  it('should remove data at paths starting with an array index', () => {
    const arrayData = new ManagedData(shallowRef(['a', 'b']), SessionMode.DataEditor);

    arrayData.removeDataAt([0]);
    expect(arrayData.data.value).toEqual(['b']);
  });

  it('should update the unparsedData when the shallowRef is updated externally', () => {
    // force calculation of unparsedData once (computed properties are lazy)
    expect(dataLink.unparsedData.value).toEqual(`{"test":"value","nested":{"test":"value"}}`);

    dataLink.shallowDataRef.value.nested.test = 'newValue';
    triggerRef(dataLink.shallowDataRef);
    expect(dataLink.unparsedData.value).toEqual(`{"test":"value","nested":{"test":"newValue"}}`);
  });
});
