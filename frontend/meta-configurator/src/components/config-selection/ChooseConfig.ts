import {useDataStore} from '@/store/dataStore';

export function chooseConfigFromFile(): void {
  const inputElement = document.createElement('input');

  inputElement.type = 'file';

  inputElement.onchange = event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = e => {
        const contents = e.target?.result as string;
        try {
          const selectedConfig = JSON.parse(contents);
          useDataStore().fileData = selectedConfig;
          console.log('Updated fileData:', selectedConfig);
        } catch (error) {
          console.error('Error parsing JSON schema:', error);
          alert('Invalid JSON file. Please choose a valid JSON file.');
        }
      };

      reader.readAsText(file);
    }
  };

  inputElement.click();
}
