import {openUploadSchemaDialog} from '@/components/toolbar/uploadSchema';
import {openUploadFileDialog} from '@/components/toolbar/uploadFile';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {schemaCollection} from '@/data/SchemaCollection';
import {useDataStore} from '@/store/dataStore';
import {newEmptyFile} from '@/components/toolbar/clearFile';
import {generateSampleData} from '@/components/toolbar/createSampleData';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {newEmptySchemafile} from '@/components/toolbar/clearSchema';
import {errorService} from '@/main';
import {ref} from 'vue';
import {storeToRefs} from 'pinia';
import type {SchemaOption} from '@/model/SchemaOption';
import {openGenerateSampleFileDialog} from '@/components/toolbar/generateSampleFile';

/**
 * Helper class that contains the menu items for the top menu bar.
 */
export class TopMenuBar {
  sessionStore = useSessionStore();
  public fetchedSchemas: SchemaOption[] = [];
  public showDialog = ref(false);
  public toast: any;
  private readonly onFromWebClick: () => Promise<void>; // Function reference for handling "From Web" click
  private readonly onFromOurExampleClick: () => void; // Function reference for handling "From Our Example" click
  private readonly handleFromURLClick: () => void;
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

  get fileEditorMenuItems() {
    return [
      {
        label: 'New File',
        icon: 'fa-regular fa-file',
        items: [
          {
            label: 'New empty File',
            icon: 'fa-regular fa-file',
            command: this.clearFile,
          },
          {
            label: 'Generate File...',
            icon: 'fa-solid fa-gears',
            command: openGenerateSampleFileDialog,
          },
        ],
      },
      {
        label: 'Open File',
        icon: 'fa-regular fa-folder-open',
        command: openUploadFileDialog,
      },
      {
        label: 'Save File',
        icon: 'fa-regular fa-floppy-disk',
        command: () => downloadFile(useDataStore().schema.title ?? 'file'),
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
            command: this.clearSchema,
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
            command: openUploadSchemaDialog,
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
        command: () => downloadFile('schema_' + useDataStore().schema.title ?? 'untitled'),
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
        command: () => downloadFile('configAssistantSettings'),
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
  private clearFile(): void {
    newEmptyFile('Do you want to clear the File editor?');
  }
  private clearSchema(): void {
    newEmptySchemafile('Do you want to clear the Schema editor?');
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
}
