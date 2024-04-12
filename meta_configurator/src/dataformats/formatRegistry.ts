import type {DataFormatDefinition} from '@/dataformats/dataFormatDefinition';
import {useSettings} from '@/settings/useSettings';
import {DataConverter} from '@/dataformats/dataConverter';
import type {PathIndexLink} from '@/dataformats/pathIndexLink';
import {noPathIndexLink} from '@/dataformats/pathIndexLink';
import {computed} from 'vue';
import {jsonFormat} from '@/dataformats/defaultFormats';

/**
 * The format registry serves as a central place to register and retrieve data formats definitions,
 * which contain the required implementations for a specific data format.
 *
 * @see DataFormatDefinition
 */
export class FormatRegistry {
  private readonly formats: Map<string, DataFormatDefinition> = new Map();

  public registerFormat(formatName: string, formatDefinition: DataFormatDefinition): void {
    this.formats.set(formatName, formatDefinition);
  }

  /**
   * Returns the data format definition for the given format name.
   * @param formatName the name of the format
   * @return the data format definition. If the format is not registered, the json format is returned.
   */
  public getFormat(formatName: string): DataFormatDefinition {
    const format = this.formats.get(formatName);
    if (format === undefined) {
      return jsonFormat; // we use json as fallback to avoid errors
    }
    return format;
  }
}

/**
 * The global format registry.
 * This is used to register and retrieve data formats.
 */
export const formatRegistry = new FormatRegistry();

const currentDataFormatRef = computed(() => {
  const dataFormat = useSettings().dataFormat ?? 'json';
  return formatRegistry.getFormat(dataFormat);
});

/**
 * Returns the data converter for the currently selected data format.
 */
export function useDataConverter(): DataConverter {
  return currentDataFormatRef.value.dataConverter;
}

/**
 * Returns the path index link for the currently selected data format.
 */
export function usePathIndexLink(): PathIndexLink {
  return currentDataFormatRef.value.pathIndexLink ?? noPathIndexLink;
}
