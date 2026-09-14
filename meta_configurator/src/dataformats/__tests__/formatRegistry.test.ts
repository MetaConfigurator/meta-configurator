import {beforeEach, describe, expect, it} from 'vitest';
import {FormatRegistry, useDataConverter, usePathIndexLink} from '../formatRegistry';
import {DataConverterJson, DataConverterYaml} from '../dataConverter';
import {useDataSource} from '@/data/dataSource';
import {triggerRef} from 'vue';
import {jsonFormat, registerDefaultDataFormats} from '../defaultFormats';
import {PathIndexLinkJson} from '../pathIndexLinkJson';
import {PathIndexLinkYaml} from '../pathIndexLinkYaml';

function setDataFormat(format: string | undefined) {
  useDataSource().settingsData.value.dataFormat = format as any;
  triggerRef(useDataSource().settingsData);
}

describe('formatRegistry', () => {
  const formatRegistry = new FormatRegistry();

  it('should return the format for the given format name', () => {
    const format = {
      fileExtensions: ['.test'],
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

describe('file based format handling', () => {
  const formatRegistry = new FormatRegistry();
  formatRegistry.registerFormat('json', {
    fileExtensions: ['.json'],
    dataConverter: new DataConverterJson(),
    pathIndexLink: null,
  });
  formatRegistry.registerFormat('yaml', {
    fileExtensions: ['.yaml', '.yml'],
    dataConverter: new DataConverterYaml(),
    pathIndexLink: null,
  });

  it('should list the file extensions of every registered format', () => {
    expect(formatRegistry.getFileExtensions()).toEqual(['.json', '.yaml', '.yml']);
  });

  it('should find the format of a file name regardless of casing', () => {
    expect(formatRegistry.getFormatForFileName('Data.JSON')?.dataConverter).toBeInstanceOf(
      DataConverterJson
    );
    expect(formatRegistry.getFormatForFileName('config.yml')?.dataConverter).toBeInstanceOf(
      DataConverterYaml
    );
    expect(formatRegistry.getFormatForFileName('notes.txt')).toBeUndefined();
  });

  it('should parse a file with the format its extension belongs to', () => {
    expect(formatRegistry.parseFileContent('person.json', '{"name":"Alice"}')).toEqual({
      name: 'Alice',
    });
    expect(formatRegistry.parseFileContent('person.yaml', 'name: Alice\n')).toEqual({
      name: 'Alice',
    });
  });

  it('should report the parse error of the format claiming the extension', () => {
    expect(() => formatRegistry.parseFileContent('broken.json', '{ not : json ]')).toThrow();
  });

  it('should try every registered format for an unknown extension', () => {
    expect(formatRegistry.parseFileContent('person.unknown', 'name: Alice\n')).toEqual({
      name: 'Alice',
    });
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
