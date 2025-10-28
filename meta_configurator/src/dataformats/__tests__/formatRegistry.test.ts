import {beforeEach, describe, expect, it} from 'vitest';
import {FormatRegistry, useDataConverter, usePathIndexLink} from '../formatRegistry';
import {DataConverterJson, DataConverterYaml} from '../dataConverter';
import {useDataSource} from '@/data/dataSource';
import {triggerRef} from 'vue';
import {jsonFormat, registerDefaultDataFormats} from '../defaultFormats';
import {PathIndexLinkJson} from '../pathIndexLinkJson';
import {PathIndexLinkYaml} from '../pathIndexLinkYaml';

function setDataFormat(format: string | undefined) {
  useDataSource().settingsData.value.dataFormat = format;
  triggerRef(useDataSource().settingsData);
}

describe('formatRegistry', () => {
  const formatRegistry = new FormatRegistry();

  it('should return the format for the given format name', () => {
    const format = {
      dataConverter: new DataConverterJson(),
      pathIndexLink: null,
    };
    formatRegistry.registerFormat('test', format);
    expect(formatRegistry.getFormat('test')).toBe(format);
  });
  it('should return the json format if the format is not registered', () => {
    expect(formatRegistry.getFormat('notRegistered')).toBe(jsonFormat);
  });
});

describe('useDataConverter', () => {
  beforeEach(() => {
    registerDefaultDataFormats();
  });

  it('should return the json converter if the data format is not set', () => {
    setDataFormat(undefined);
    const dataConverter = useDataConverter();
    expect(dataConverter).toBeInstanceOf(DataConverterJson);
  });
  it('should return the json converter if the data format is json', () => {
    setDataFormat('json');
    const dataConverter = useDataConverter();
    expect(dataConverter).toBeInstanceOf(DataConverterJson);
  });
  it('should return the yaml converter if the data format is yaml', () => {
    setDataFormat('yaml');
    const dataConverter = useDataConverter();
    expect(dataConverter).toBeInstanceOf(DataConverterYaml);
  });
  it('should be reactive', () => {
    setDataFormat('json');
    expect(useDataConverter()).toBeInstanceOf(DataConverterJson);
    setDataFormat('yaml');
    expect(useDataConverter()).toBeInstanceOf(DataConverterYaml);
  });
});

describe('usePathIndexLink', () => {
  beforeEach(() => {
    registerDefaultDataFormats();
  });

  it('should return the json path index link if the data format is not set', () => {
    setDataFormat(undefined);
    expect(usePathIndexLink()).toBeInstanceOf(PathIndexLinkJson);
  });
  it('should return the json path index link if the data format is json', () => {
    setDataFormat('json');
    expect(usePathIndexLink()).toBeInstanceOf(PathIndexLinkJson);
  });
  it('should return the json path index link if the data format is yaml', () => {
    setDataFormat('yaml');
    expect(usePathIndexLink()).toBeInstanceOf(PathIndexLinkYaml);
  });
  it('should be reactive', () => {
    setDataFormat('json');
    expect(usePathIndexLink()).toBeInstanceOf(PathIndexLinkJson);
    setDataFormat('yaml');
    expect(usePathIndexLink()).toBeInstanceOf(PathIndexLinkYaml);
  });
});
