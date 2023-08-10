import {chooseSchemaFromFile} from '@/components/toolbar/uploadSchema';
import {chooseConfigFromFile} from '@/components/toolbar/uploadConfig';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {schemaCollection} from '@/data/SchemaCollection';
import {useDataStore} from '@/store/dataStore';
import {newEmptyFile} from '@/components/toolbar/clearContent';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {newEmptySchemafile} from '@/components/toolbar/clearSchema';
import {errorService} from '@/main';
import {ref} from 'vue';
import {storeToRefs} from 'pinia';
import {newEmptyFileAfterGeneration} from '@/components/toolbar/GenerateFileClearance';

/**
 * Helper class that contains the menu items for the top menu bar.
 */
export class TopMenuBar {
  sessionStore = useSessionStore();
  public fetchedSchemas: {
    label: string;
    icon: string;
    url: string | undefined;
    key: string | undefined;
  }[] = [];
  private toast: any;
  private onFromWebClick: () => Promise<void>; // Function reference for handling "From Web" click
  private onFromOurExampleClick: () => void; // Function reference for handling "From Our Example" click
  private handleFromURLClick: () => void;
  constructor(
    toast = null,
    onFromWebClick: () => Promise<void>, // Add this parameter to the constructor
    onFromOurExampleClick: () => void,
    handleFromURLClick: () => void
  ) {
    this.toast = toast;
    this.onFromWebClick = onFromWebClick;
    this.onFromOurExampleClick = onFromOurExampleClick;
    this.handleFromURLClick = handleFromURLClick;
  }
  public async fetchWebSchemas(): Promise<void> {
    const schemaStoreURL = 'https://www.schemastore.org/api/json/catalog.json';

    try {
      const response = await fetch(schemaStoreURL);
      const data = await response.json();
      const schemas = data.schemas;
      this.fetchedSchemas = [];
      schemas.forEach((schema: {name: string; url: string; key: string}) => {
        this.fetchedSchemas.push({
          label: schema.name,
          icon: 'pi pi-fw pi-code',
          url: schema.url,
          key: schema.key,
        });
      });
    } catch (error) {
      // Handle the error if there's an issue fetching the schema.
      errorService.onError(error);
    }
  }

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
        disabled: () => !storeToRefs(useSessionStore()).currentEditorWrapper.value.hasUndo(),
        key: 'undo',
        command: () => {
          this.sessionStore.currentEditorWrapper.undo();
        },
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          this.sessionStore.currentEditorWrapper.redo();
        },
        key: 'redo',
        disabled: () => !useSessionStore().currentEditorWrapper.hasRedo(),
      },
      {
        separator: true,
      },
      {
        label: 'Share',
        class: 'z-10',
        icon: 'fa-solid fa-share-nodes',
        disabled: true,
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
            disabled: true,
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
            command: this.onFromWebClick,
          },
          {
            label: 'From URL',
            icon: 'fa-solid fa-globe',

            command: this.handleFromURLClick,
          },
          {
            label: 'Example Schemas',
            icon: 'fa-solid fa-database',
            command: this.onFromOurExampleClick,
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
        command: () => {
          this.sessionStore.currentEditorWrapper.undo();
        },
        disabled: () => !useSessionStore().currentEditorWrapper.hasUndo(),
        key: 'schema_undo',
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          this.sessionStore.currentEditorWrapper.redo();
        },
        disabled: () => !useSessionStore().currentEditorWrapper.hasRedo(),
        key: 'schema_redo',
      },
      {
        separator: true,
      },
      {
        label: 'Share',
        class: 'z-10',
        icon: 'fa-solid fa-share-nodes',
        disabled: true,
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
        disabled: true,
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
        command: () => {
          this.sessionStore.currentEditorWrapper.undo();
        },
        disabled: () => !useSessionStore().currentEditorWrapper.hasUndo(),
        key: 'settings_undo',
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          this.sessionStore.currentEditorWrapper.redo();
        },
        disabled: () => !useSessionStore().currentEditorWrapper.hasRedo(),
        key: 'settings_redo',
      },
      {
        separator: true,
      },
      {
        label: 'Share',
        class: 'z-10',
        icon: 'fa-solid fa-share-nodes',
        disabled: true,
      },
    ];
  }
  private uploadSchema(): void {
    chooseSchemaFromFile();
  }
  private chooseConfig(): void {
    chooseConfigFromFile();
  }
  private generateSampleFile() {
    newEmptyFileAfterGeneration(
      'This will delete all the existing data. Are you sure you want to continue?'
    );
  }
  private downloadFile(fileNamePrefix: string): void {
    downloadFile(fileNamePrefix);
  }
  private clearEditor(): void {
    newEmptyFile('Do you want to clear the File editor?');
  }
  private clearSchemaEditor(): void {
    newEmptySchemafile('Do you want to clear the Schema editor?');
  }
  public showDialog = ref(false);

  public async selectSchema(schemaURL: string): Promise<void> {
    try {
      // Fetch the schema content from the selected schemaURL.
      const response = await fetch(schemaURL);
      const schemaContent = await response.json();
      const schemaName = schemaContent.title || 'Unknown Schema';
      useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
      // Update the schemaData in the dataStore with the fetched schema content.
      useDataStore().schemaData = schemaContent;
      // Always clear the data without prompting the user.
      newEmptyFile('Do you want to also clear the current config file?');

      if (this.toast) {
        this.toast.add({
          severity: 'info',
          summary: 'Info',
          detail: `"${schemaName}" fetched successfully!`,
          life: 3000,
        });
      }
    } catch (error) {
      // Handle the error if there's an issue fetching the schema.
      errorService.onError(error);
    }
  }
  public fetchExampleSchema(schemaKey: string): void {
    try {
      const selectedSchema: any = schemaCollection.find(schema => schema.key === schemaKey);
      useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
      const schemaName = selectedSchema.label || 'Unknown Schema';
      useDataStore().schemaData = selectedSchema?.schema;
      newEmptyFile('Do you want to also clear the current config file?');

      if (this.toast) {
        this.toast.add({
          severity: 'info',
          summary: 'Info',
          detail: `"${schemaName}" fetched successfully!`,
          life: 3000,
        });
      }
    } catch (error) {
      // Handle the error if there's an issue fetching the schema.
      errorService.onError(error);
    }
  }
  public async fetchSchemaFromURL(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const schemaContent = await response.json();
      const schemaName = schemaContent.title || 'Unknown Schema';
      useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
      // Update the schemaData in the dataStore with the fetched schema content.
      useDataStore().schemaData = schemaContent;
      // Always clear the data without prompting the user.
      newEmptyFile('Do you want to also clear the current config file?');

      if (this.toast) {
        this.toast.add({
          severity: 'info',
          summary: 'Info',
          detail: `"${schemaName}" fetched successfully!`,
          life: 3000,
        });
      }
    } catch (error) {
      // Handle the error if there's an issue fetching the schema.
      errorService.onError(error);
    }
  }
}
