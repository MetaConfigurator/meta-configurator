import {chooseSchemaFromFile} from '@/components/toolbar/uploadSchema';
import {chooseConfigFromFile} from '@/components/toolbar/uploadConfig';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {schemaCollection} from '@/data/SchemaCollection';
import {useDataStore} from '@/store/dataStore';

import {clearEditor} from '@/components/toolbar/clearContent';
import {generateSampleData} from '@/components/toolbar/createSampleData';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {clearSchemaEditor} from '@/components/toolbar/clearSchema';
import {errorService} from '@/main';

/**
 * Helper class that contains the menu items for the top menu bar.
 */
export class TopMenuBar {
  get fileEditorMenuItems() {
    return [
      {
        label: 'New File',
        icon: 'fa-regular fa-file',
        items: [
          {
            label: 'New empty File',
            icon: 'fa-regular fa-file',
            command: this.clearEditor,
          },
          {
            label: 'Generate File...',
            icon: 'fa-solid fa-gears',
            command: this.generateSampleFile,
          },
        ],
      },
      {
        label: 'Open File',
        icon: 'fa-regular fa-folder-open',
        command: this.chooseConfig,
      },
      {
        label: 'Save File',
        icon: 'fa-regular fa-floppy-disk',
        command: () => this.downloadFile(useDataStore().schema.title ?? 'file'),
      },
      {
        separator: true,
      },
      {
        label: 'Undo',
        icon: 'fa-solid fa-rotate-left',
        command: () => console.log('undo'),
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => console.log('redo'),
      },
      {
        separator: true,
      },
      {
        label: 'Share',
        class: 'z-10',
        icon: 'fa-solid fa-share-nodes',
      },
    ];
  }

  get schemaEditorMenuItems() {
    return [
      {
        label: 'New empty Schema',
        icon: 'fa-regular fa-file',
        items: [
          {
            label: 'New empty Schema',
            icon: 'fa-regular fa-file',
            command: this.clearSchemaEditor,
          },
          {
            label: 'Infer Schema',
            icon: 'fa-solid fa-wand-magic-sparkles',
            command: () => {
              throw new Error('Not implemented yet');
            },
          },
        ],
      },
      {
        label: 'Open Schema',
        icon: 'fa-regular fa-folder-open',
        items: [
          {
            label: 'From File',
            icon: 'fa-regular fa-folder-open',
            command: this.uploadSchema,
          },
          {
            label: 'From JSON Schema Store',
            icon: 'fa-solid fa-database',
            command: this.chooseSchema,
          },
          {
            label: 'From URL',
            icon: 'fa-solid fa-globe',
            command: () => {
              throw new Error('Not implemented yet');
            },
          },
          {
            label: 'Example Schemas',
            icon: 'fa-solid fa-database',
            command: () => {
              throw new Error('Not implemented yet');
            },
          },
        ],
      },
      {
        label: 'Save File',
        icon: 'fa-regular fa-floppy-disk',
        command: () => this.downloadFile('schema_' + useDataStore().schema.title ?? 'untitled'),
      },
      {
        separator: true,
      },
      {
        label: 'Undo',
        icon: 'fa-solid fa-rotate-left',
        command: () => console.log('undo'),
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => console.log('redo'),
      },
      {
        separator: true,
      },
      {
        label: 'Share',
        class: 'z-10',
        icon: 'fa-solid fa-share-nodes',
      },
    ];
  }

  get settingsMenuItems() {
    return [
      {
        label: 'Open settings file',
        icon: 'fa-regular fa-folder-open',
        command: () => {
          throw new Error('Not implemented yet');
        },
      },
      {
        label: 'Save settings file',
        icon: 'fa-regular fa-floppy-disk',
        command: () => this.downloadFile('configAssistantSettings'),
      },
      {
        separator: true,
      },
      {
        label: 'Undo',
        icon: 'fa-solid fa-rotate-left',
        command: () => console.log('undo'),
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => console.log('redo'),
      },
      {
        separator: true,
      },
      {
        label: 'Share',
        class: 'z-10',
        icon: 'fa-solid fa-share-nodes',
      },
    ];
  }
  private uploadSchema(): void {
    chooseSchemaFromFile();
  }
  private chooseSchema(schemaKey: string): void {
    const selectedSchema: any = schemaCollection.find(schema => schema.key === schemaKey);
    useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
    useDataStore().schemaData = selectedSchema?.schema;
  }

  private chooseConfig(): void {
    chooseConfigFromFile();
  }
  private generateSampleFile() {
    const confirmClear = window.confirm(
      'This will delete all the existing data. Are you sure you want to continue?'
    );

    if (confirmClear) {
      useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
      generateSampleData(useDataStore().schemaData)
        .then(data => (useDataStore().fileData = data))
        .catch((error: Error) =>
          errorService.onError({
            message: 'Error generating sample data',
            details: error.message,
            stack: error.stack,
          })
        );
    }
  }
  private downloadFile(fileNamePrefix: string): void {
    downloadFile(fileNamePrefix);
  }
  private clearEditor(): void {
    clearEditor();
  }
  private clearSchemaEditor(): void {
    clearSchemaEditor();
  }
}
