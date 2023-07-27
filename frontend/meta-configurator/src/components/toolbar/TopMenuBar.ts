import type {MenuItemCommandEvent} from 'primevue/menuitem';
import {chooseSchemaFromFile} from '@/components/toolbar/uploadSchema';
import {chooseConfigFromFile} from '@/components/toolbar/uploadConfig';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {schemaCollection} from '@/data/SchemaCollection';
import {useDataStore} from '@/store/dataStore';

import {clearEditor} from '@/components/toolbar/clearContent';
import {generateSampleData} from '@/components/toolbar/createSampleData';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {clearSchemaEditor} from '@/components/toolbar/clearSchema';

/**
 * Helper class that contains the menu items for the top menu bar.
 */
export class TopMenuBar {
  sessionStore = useSessionStore();
  constructor(public onMenuItemClicked: (event: MenuItemCommandEvent) => void) {}

  get fileEditorMenuItems() {
    return [
      {
        icon: 'pi pi-chevron-left',
        command: () => {
          if (this.sessionStore.currentMode == 'file_editor') {
            this.sessionStore.fileEditorUndoManager.undo();
          }
        },
      },
      {
        icon: 'pi pi-chevron-right',
        command: () => {
          if (this.sessionStore.currentMode == 'file_editor') {
            this.sessionStore.fileEditorUndoManager.redo();
          }
        },
      },

      {
        label: 'File',
        icon: 'pi pi-fw pi-pencil',
        class: 'z-10',
        items: [
          {
            label: 'Clear File',
            icon: 'pi pi-fw pi-file-edit',
            command: this.clearEditor,
          },
          {
            label: 'Upload File',
            icon: 'pi pi-fw pi-upload',
            command: this.chooseConfig,
          },
          {
            label: 'Generate Sample',
            icon: 'pi pi-fw pi-cog',
            command: this.generateSampleFile,
          },
          {
            separator: true,
          },
          {
            label: 'Download File',
            icon: 'pi pi-fw pi-download',
            command: () => this.downloadFile(useDataStore().schema.title ?? 'file'),
          },
        ],
      },
      {
        class: 'z-10',
        icon: 'pi pi-fw pi-share-alt',
        command: this.onMenuItemClicked,
      },
    ];
  }

  get schemaEditorMenuItems() {
    return [
      {
        icon: 'pi pi-chevron-left',
        command: () => {
          if (this.sessionStore.currentMode == 'schema_editor') {
            this.sessionStore.schemaEditorUndoManager.undo();
          }
        },
      },
      {
        icon: 'pi pi-chevron-right',
        command: () => {
          if (this.sessionStore.currentMode == 'schema_editor') {
            this.sessionStore.schemaEditorUndoManager.redo();
          }
        },
      },

      {
        label: 'Schema',
        icon: 'pi pi-fw pi-pencil',
        class: 'z-10',
        items: [
          {
            label: 'Clear Schema',
            icon: 'pi pi-fw pi-trash',
            command: this.clearSchemaEditor,
          },
          {
            label: 'Upload Schema',
            icon: 'pi pi-fw pi-upload',
            command: this.uploadSchema,
          },
          {
            label: 'Choose Schema',
            icon: 'pi pi-fw pi-pencil',
            items: schemaCollection.map(schema => ({
              label: schema.label,
              icon: 'pi pi-fw pi-code',
              key: schema.key,
              command: () => this.chooseSchema(schema.key),
            })),
          },
          {
            separator: true,
          },
          {
            label: 'Download Schema',
            icon: 'pi pi-fw pi-download',
            command: () => this.downloadFile('schema_' + useDataStore().schema.title ?? 'untitled'),
          },
        ],
      },
      {
        class: 'z-10',
        icon: 'pi pi-fw pi-share-alt',
        command: this.onMenuItemClicked,
      },
    ];
  }

  get settingsMenuItems() {
    return [
      {
        icon: 'pi pi-chevron-left',
        command: () => {
          if (this.sessionStore.currentMode == 'settings') {
            this.sessionStore.settingsEditorUndoManager.undo();
          }
        },
      },
      {
        icon: 'pi pi-chevron-right',
        command: () => {
          if (this.sessionStore.currentMode == 'settings') {
            this.sessionStore.settingsEditorUndoManager.redo();
          }
        },
      },
    ];
  }
  private uploadSchema(): void {
    chooseSchemaFromFile();
  }
  private chooseSchema(schemaKey: string): void {
    let selectedSchema: any = schemaCollection.find(schema => schema.key === schemaKey);
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
      useSessionStore().lastChangeResponsible = ChangeResponsible.FileUpload;
      useDataStore().fileData = generateSampleData(useDataStore().schema.jsonSchema);
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

  // private undo(): void {
  //   const sessionStore = useSessionStore();
  //
  //   switch (sessionStore.currentMode) {
  //     case SessionMode.FileEditor:
  //       sessionStore.fileEditorUndoManager.undo(true);
  //       break;
  //     case SessionMode.SchemaEditor:
  //       sessionStore.schemaEditorUndoManager.undo(true);
  //       break;
  //     case SessionMode.Settings:
  //       sessionStore.settingsEditorUndoManager.undo(true);
  //       break;
  //   }
  // }
  //
  // private redo(): void {
  //
  //   switch (this.sessionStore.currentMode) {
  //     case SessionMode.FileEditor:
  //       sessionStore.fileEditorUndoManager.redo(true);
  //       break;
  //     case SessionMode.SchemaEditor:
  //       sessionStore.schemaEditorUndoManager.redo(true);
  //       break;
  //     case SessionMode.Settings:
  //       sessionStore.settingsEditorUndoManager.redo(true);
  //       break;
  //   }
  // }
}
