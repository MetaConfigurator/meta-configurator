import type {DataFormatDefinition} from '@/dataformats/dataFormatDefinition';
import {useSettings} from '@/settings/useSettings';
import {DataConverter} from '@/dataformats/dataConverter';
import type {PathIndexLink} from '@/dataformats/pathIndexLink';
import {noPathIndexLink} from '@/dataformats/pathIndexLink';
import {computed} from 'vue';
import {jsonFormat} from '@/dataformats/defaultFormats';

const settings = useSettings();

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

  /**
   * Return a list of all registered data format names.
   */
  public getFormatNames(): string[] {
    return Array.from(this.formats.keys());
  }

  /**
   * Returns the file extensions of all registered formats, for example to build the
   * accept filter of a file dialog.
   */
  public getFileExtensions(): string[] {
    return Array.from(this.formats.values()).flatMap(format => format.fileExtensions);
  }

  /**
   * Returns the format whose file extensions match the given file name, or undefined
   * when no registered format claims that extension.
   */
  public getFormatForFileName(fileName: string): DataFormatDefinition | undefined {
    const lowerCaseFileName = fileName.trim().toLowerCase();
    return Array.from(this.formats.values()).find(format =>
      format.fileExtensions.some(fileExtension => lowerCaseFileName.endsWith(fileExtension))
    );
  }

  /**
   * Parses the content of an uploaded file. The file extension decides the format when a
   * registered format claims it; otherwise every registered format is tried in
   * registration order, and the error of the last attempt is thrown when none succeeds.
   */
  public parseFileContent(fileName: string, fileContent: string): unknown {
    const formatForFileName = this.getFormatForFileName(fileName);
    if (formatForFileName) {
      return formatForFileName.dataConverter.parse(fileContent);
    }

    let lastParseError: unknown = new Error(
      `No data format is registered that could parse "${fileName}".`
    );
    for (const format of this.formats.values()) {
      try {
        return format.dataConverter.parse(fileContent);
      } catch (parseError) {
        lastParseError = parseError;
      }
    }
    throw lastParseError;
  }
}

/**
 * The global format registry.
 * This is used to register and retrieve data formats.
 */
export const formatRegistry = new FormatRegistry();

const currentDataFormatRef = computed(() => {
  const dataFormat = settings.value.dataFormat ?? 'json';
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
