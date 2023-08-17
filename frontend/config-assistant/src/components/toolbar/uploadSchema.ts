import {useDataStore} from '@/store/dataStore';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {errorService} from '@/main';

export function openUploadSchemaDialog(): void {
  const inputElement = document.createElement('input');

  inputElement.type = 'file';

  inputElement.onchange = event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = e => {
        const contents = e.target?.result as string;
        try {
          const selectedSchema = JSON.parse(contents);
          useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
          useDataStore().schemaData = selectedSchema;
        } catch (error) {
          errorService.onError(error);
        }
      };
      reader.readAsText(file);
    }
  };
  inputElement.click();
}
