import type {DataFormatDefinition} from '@/formats/dataFormatDefinition';
import {DataConverterJson, DataConverterYaml} from '@/formats/dataConverter';
import {PathIndexLinkJson} from '@/formats/pathIndexLinkJson';
import {formatRegistry} from '@/formats/formatRegistry';

export const jsonFormat: DataFormatDefinition = {
  dataConverter: new DataConverterJson(),
  pathIndexLink: new PathIndexLinkJson(),
};

const yamlFormat: DataFormatDefinition = {
  dataConverter: new DataConverterYaml(),
  pathIndexLink: null,
};

/**
 * Registers the default data formats, which are JSON and YAML.
 */
export function registerDefaultDataFormats() {
  formatRegistry.registerFormat('json', jsonFormat);
  formatRegistry.registerFormat('yaml', yamlFormat);
}
