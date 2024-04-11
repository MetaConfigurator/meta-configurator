import {openUploadFileDialog, openUploadSchemaDialog} from '@/components/toolbar/uploadFile';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {openClearCurrentFileDialog, openClearSchemaDialog} from '@/components/toolbar/clearFile';
import {useSessionStore} from '@/store/sessionStore';
import {ref} from 'vue';
import type {SchemaOption} from '@/model/schemaOption';
import {openGenerateDataDialog} from '@/components/toolbar/createSampleData';
import {getDataForMode, useCurrentData, useCurrentSchema} from '@/data/useDataLink';
import {useDataSource} from '@/data/dataSource';
import {SessionMode} from '@/model/sessionMode';

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
            command: openClearCurrentFileDialog,
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
        command: () => openUploadFileDialog(getDataForMode(SessionMode.FileEditor)),
      },
      {
        label: 'Download File',
        icon: 'fa-solid fa-download',
        command: () => downloadFile(useCurrentSchema().schemaRaw.value.title ?? 'file'),
      },
      {
        separator: true,
      },
      {
        label: 'Undo',
        icon: 'fa-solid fa-rotate-left',
        key: 'undo',
        command: () => {
          useCurrentData().undoManager.undo();
        },
        disabled: () => !useCurrentData().undoManager.canUndo,
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          useCurrentData().undoManager.redo();
        },
        disabled: () => !useCurrentData().undoManager.canRedo,
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
        command: () =>
          downloadFile('schema_' + (useDataSource().userSchemaData.value.title ?? 'untitled')),
      },
      {
        separator: true,
      },
      {
        label: 'Undo',
        icon: 'fa-solid fa-rotate-left',
        command: () => {
          useCurrentData().undoManager.undo();
        },
        disabled: () => !useCurrentData().undoManager.canUndo,
        key: 'schema_undo',
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          useCurrentData().undoManager.redo();
        },
        disabled: () => !useCurrentData().undoManager.canRedo,
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
          useCurrentData().undoManager.undo();
        },
        disabled: () => !useCurrentData().undoManager.canUndo,
        key: 'settings_undo',
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          useCurrentData().undoManager.redo();
        },
        disabled: () => !useCurrentData().undoManager.canRedo,
        key: 'settings_redo',
      },
    ];
  }
}
