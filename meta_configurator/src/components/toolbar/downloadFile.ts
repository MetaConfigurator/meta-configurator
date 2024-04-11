import {useCurrentData} from '@/data/useDataLink';
import {useSettings} from '@/settings/useSettings';

/**
 * Downloads the current config file as a JSON or YAML file.
 * TODO consider using a library for this
 * @param fileNamePrefix The prefix for the filename
 */
export function downloadFile(fileNamePrefix: string): void {
  const configData: string = useCurrentData().unparsedData.value;

  // TODO correct type depending on the data format
  const blob: Blob = new Blob([configData], {type: 'application/json'});

  // Generate a unique filename for the downloaded config
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const formattedDate = formatter.format(now);
  const fileEnding = useSettings().dataFormat === 'yaml' ? 'yml' : 'json';
  const fileName: string = `${fileNamePrefix}-${formattedDate}.${fileEnding}`;

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
