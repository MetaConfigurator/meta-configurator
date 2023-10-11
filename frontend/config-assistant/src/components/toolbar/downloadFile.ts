import {useSessionStore} from '@/store/sessionStore';
import {useSettingsStore} from '@/store/settingsStore';

export function downloadFile(fileNamePrefix: string): void {
  const configData: string = useSessionStore().editorContentUnparsed;

  // Create a Blob object from the config string
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
  const fileEnding = useSettingsStore().settingsData.dataFormat === 'yaml' ? 'yml' : 'json';
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
