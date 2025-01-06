import type {DataFormatDefinition} from '@/dataformats/dataFormatDefinition';
import {DataConverterJson, DataConverterYaml} from '@/dataformats/dataConverter';
import {PathIndexLinkJson} from '@/dataformats/pathIndexLinkJson';
import {formatRegistry} from '@/dataformats/formatRegistry';
import {PathIndexLinkYaml} from '@/dataformats/pathIndexLinkYaml';

export const jsonFormat: DataFormatDefinition = {
  dataConverter: new DataConverterJson(),
  pathIndexLink: new PathIndexLinkJson(),
};

const yamlFormat: DataFormatDefinition = {
  dataConverter: new DataConverterYaml(),
  pathIndexLink: new PathIndexLinkYaml(),
};

/**
 * Registers the default data formats, which are JSON and YAML.
 */
export function registerDefaultDataFormats() {
  formatRegistry.registerFormat('json', jsonFormat);
  formatRegistry.registerFormat('yaml', yamlFormat);
}
