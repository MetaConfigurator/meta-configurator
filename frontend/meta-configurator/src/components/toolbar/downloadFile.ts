import {useSessionStore} from '@/store/sessionStore';

export function downloadFile(fileNamePrefix: string): void {
  // Get the current config data from the `fileData` variable
  const configData: any = useSessionStore().fileData;
  // Convert the config data to a JSON string
  const configString: string = JSON.stringify(configData, null, 2);

  // Create a Blob object from the config string
  const blob: Blob = new Blob([configString], {type: 'application/json'});

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
  const fileName: string = `${fileNamePrefix}-${formattedDate}.json`;

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
