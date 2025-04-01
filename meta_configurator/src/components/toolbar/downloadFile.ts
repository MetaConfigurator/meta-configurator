import {useCurrentData} from '@/data/useDataLink';
import {useSettings} from '@/settings/useSettings';

/**
 * Downloads the current config file as a JSON or YAML file.
 * TODO consider using a library for this
 * @param fileNamePrefix The prefix for the filename
 * @param isSchema Whether the file is a schema file
 */
export function downloadFile(fileNamePrefix: string, isSchema: boolean): void {
  const configData: string = isSchema
    ? JSON.stringify(useCurrentData().data.value)
    : useCurrentData().unparsedData.value;

  // TODO correct type depending on the data format
  const blob: Blob = new Blob([configData], {type: 'application/json'});

  const fileEnding = isSchema ? 'schema.json' : useSettings().value.dataFormat;
  const fileName: string = `${fileNamePrefix}.${fileEnding}`;

  // Create a temporary link element
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;

  // Append the link to the document body and click it programmatically to trigger the download
  document.body.appendChild(link);
  link.click();

  // Clean up by removing the link element and revoking the object URL
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
