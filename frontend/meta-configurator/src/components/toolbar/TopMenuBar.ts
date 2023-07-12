import type {MenuItemCommandEvent} from 'primevue/menuitem';
import {useSettingsStore} from '@/store/settingsStore';
import {chooseConfigFromFile} from '@/components/config-selection/ChooseConfig';
import {downloadConfig} from '@/components/download-config/downloadConfig';
import {combinedSchema} from '@/data/CombinedSchema';
import {handleChooseSchema} from './schemaActions';
import {chooseSchemaFromFile} from '@/components/schema-selection/ChooseSchema';

export class TopMenuBar {
  private selectedSchemaKey: string = 'default';

  constructor(public onMenuItemClicked: (event: MenuItemCommandEvent) => void) {}

  get fileEditorMenuItems() {
    console.log('Combined Schema:', combinedSchema);
    return [
      {
        label: 'File',
        icon: 'pi pi-fw pi-file',
        class: 'z-10',
        items: [
          {
            label: 'Clear',
            icon: 'pi pi-fw pi-trash',
            command: this.onMenuItemClicked,
          },
          {
            label: 'Upload Config',
            icon: 'pi pi-fw pi-cloud-upload',
            command: this.chooseConfig,
          },
          {
            separator: true,
          },
          {
            label: 'Download',
            icon: 'pi pi-fw pi-cloud-download',
            command: this.download,
          },
          {
            label: 'Select Config Language',
            icon: 'pi pi-fw pi-user-edit',
            class: 'z-10',
            items: [
              {
                label: 'JSON',
                icon: 'pi pi-fw pi-code',
                key: 'json',
                command: (event: MenuItemCommandEvent) =>
                  (useSettingsStore().settingsData.configLanguage = 'json'),
              },
              {
                label: 'YAML',
                icon: 'pi pi-fw pi-code',
                key: 'yaml',
                command: (event: MenuItemCommandEvent) =>
                  (useSettingsStore().settingsData.configLanguage = 'yaml'),
              },
            ],
          },
        ],
      },
      {
        label: 'Schema',
        icon: 'pi pi-fw pi-pencil',
        class: 'z-10',
        items: [
          {
            label: 'Edit schema',
            icon: 'pi pi-fw pi-align-left',
            command: this.onMenuItemClicked,
          },
          {
            label: 'Change schema',
            icon: 'pi pi-fw pi-align-right',
            command: this.onMenuItemClicked,
          },
          {
            label: 'Choose schema',
            icon: 'pi pi-fw pi-pencil',
            items: combinedSchema.map((schema, index) => ({
              label: schema.label,
              icon: 'pi pi-fw pi-code',
              key: schema.key,
              command: () => this.chooseSchema(schema.key),
            })),
          },
        ],
      },
      {
        label: 'View',
        icon: 'pi pi-fw pi-eye',
        class: 'z-10',
        items: [
          {
            label: 'Flip order',
            icon: 'pi pi-fw pi-arrows-h',
            key: 'toggle-order',
            command: this.onMenuItemClicked,
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
    return [];
  }

  get settingsMenuItems() {
    return [];
  }

  private chooseSchema(schemaKey: string): void {
    this.selectedSchemaKey = schemaKey;
    handleChooseSchema(combinedSchema.find(schema => schema.key === schemaKey));
  }

  private chooseConfig(): void {
    chooseConfigFromFile();
  }

  private download(): void {
    downloadConfig();
  }
}
