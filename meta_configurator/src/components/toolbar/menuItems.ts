import {openUploadSchemaDialog} from '@/components/toolbar/uploadSchema';
import {openUploadFileDialog} from '@/components/toolbar/uploadFile';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {useDataStore} from '@/store/dataStore';
import {openClearFileDialog} from '@/components/toolbar/clearFile';
import {openClearSchemaDialog} from '@/components/toolbar/clearSchema';
import {useSessionStore} from '@/store/sessionStore';
import {ref} from 'vue';
import type {SchemaOption} from '@/model/schemaOption';
import {openGenerateDataDialog} from '@/components/toolbar/createSampleData';

/**
 * Helper class that contains the menu items for the top menu bar.
 */
export class MenuItems {
  sessionStore = useSessionStore();
  public fetchedSchemas: SchemaOption[] = [];
  public showDialog = ref(false);

  private readonly onFromWebClick: () => Promise<void>;
  private readonly onFromOurExampleClick: () => void;
  private readonly handleFromURLClick: () => void;
  constructor(
    onFromSchemaStoreClick: () => Promise<void>,
    onFromOurExampleClick: () => void,
    onFromURLClick: () => void
  ) {
    this.onFromWebClick = onFromSchemaStoreClick;
    this.onFromOurExampleClick = onFromOurExampleClick;
    this.handleFromURLClick = onFromURLClick;
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
            command: openClearFileDialog,
          },
          {
            label: 'Generate File...',
            icon: 'fa-solid fa-gears',
            command: openGenerateDataDialog,
            disabled: true, // currently not working in the deployed version
          },
        ],
      },
      {
        label: 'Open File',
        icon: 'fa-regular fa-folder-open',
        command: openUploadFileDialog,
      },
      {
        label: 'Download File',
        icon: 'fa-solid fa-download',
        command: () => downloadFile(useDataStore().schema.title ?? 'file'),
      },
      {
        separator: true,
      },
      {
        label: 'Undo',
        icon: 'fa-solid fa-rotate-left',
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
            command: openClearSchemaDialog,
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
        label: 'Download Schema',
        icon: 'fa-solid fa-download',
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
        key: 'schema_undo',
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          this.sessionStore.currentEditorWrapper.redo();
        },
        key: 'schema_redo',
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
        command: () => downloadFile('metaConfiguratorSettings'),
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
        key: 'settings_undo',
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          this.sessionStore.currentEditorWrapper.redo();
        },
        key: 'settings_redo',
      },
    ];
  }
}
