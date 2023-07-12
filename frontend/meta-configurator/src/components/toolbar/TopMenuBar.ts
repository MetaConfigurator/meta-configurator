import type {MenuItemCommandEvent} from 'primevue/menuitem';
import {chooseSchemaFromFile} from '@/components/toolbar/uploadSchema';
import {chooseConfigFromFile} from '@/components/toolbar/uploadConfig';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {clearEditor} from '@/components/toolbar/ClearContent';
import {storeSchema} from '@/data/StoreSchema';
import {useDataStore} from '@/store/dataStore';
/**
 * Helper class that contains the menu items for the top menu bar.
 */
export class TopMenuBar {
  private selectedSchemaKey: string = 'default';
  constructor(public onMenuItemClicked: (event: MenuItemCommandEvent) => void) {}

  get fileEditorMenuItems() {
    return [
      {
        label: 'File',
        icon: 'pi pi-fw pi-file',
        class: 'z-10', // z-10 is required otherwise the menu is behind the ace editor
        items: [
          {
            label: 'Clear File',
            icon: 'pi pi-fw pi-trash',
            command: this.clearEditor,
          },
          {
            label: 'Upload File',
            icon: 'pi pi-fw pi-upload',
            command: this.chooseConfig,
          },
          {
            separator: true,
          },
          {
            label: 'Download File',
            icon: 'pi pi-fw pi-download',
            command: this.download,
          },
        ],
      },
      {
        label: 'Schema',
        icon: 'pi pi-fw pi-pencil',
        class: 'z-10',
        items: [
          {
            label: 'Upload schema',
            icon: 'pi pi-fw pi-upload',
            command: this.uploadSchema,
          },
          {
            label: 'Choose schema',
            icon: 'pi pi-fw pi-pencil',
            items: storeSchema.map(schema => ({
              label: schema.label,
              icon: 'pi pi-fw pi-code',
              key: schema.key,
              command: () => this.chooseSchema(schema.key, this.selectedSchemaKey),
            })),
          },
        ],
      },

      {
        label: 'Share',
        class: 'z-10',
        icon: 'pi pi-fw pi-share-alt',
        command: this.onMenuItemClicked,
      },
    ];
  }

  get schemaEditorMenuItems() {
    return [
      {
        label: 'Schema',
        icon: 'pi pi-fw pi-file',
        class: 'z-10', // z-10 is required otherwise the menu is behind the ace editor
        items: [
          {
            label: 'Clear Schema',
            icon: 'pi pi-fw pi-trash',
            command: this.onMenuItemClicked,
          },
          {
            label: 'Upload Schema',
            icon: 'pi pi-fw pi-upload',
            command: this.uploadSchema,
          },
          {
            label: 'Choose schema',
            icon: 'pi pi-fw pi-pencil',
            items: storeSchema.map(schema => ({
              label: schema.label,
              icon: 'pi pi-fw pi-code',
              key: schema.key,
              command: () => this.chooseSchema(schema.key, this.selectedSchemaKey),
            })),
          },
          {
            separator: true,
          },
          {
            label: 'Download Schema',
            icon: 'pi pi-fw pi-download',
            command: this.download,
          },
        ],
      },

      {
        label: 'Share',
        class: 'z-10',
        icon: 'pi pi-fw pi-share-alt',
        command: this.onMenuItemClicked,
      },
    ];
  }

  get settingsMenuItems() {
    return [];
  }
  private uploadSchema(): void {
    chooseSchemaFromFile();
  }
  private chooseSchema(schemaKey: string, selectedSchema: any): void {
    this.selectedSchemaKey = schemaKey;
    selectedSchema = storeSchema.find(schema => schema.key === schemaKey);
    useDataStore().schemaData = selectedSchema?.schema;
  }

  private chooseConfig(): void {
    chooseConfigFromFile();
  }
  private download(): void {
    downloadFile();
  }
  private clearEditor(): void {
    console.log('Clearing editor');
    clearEditor();
  }
}
