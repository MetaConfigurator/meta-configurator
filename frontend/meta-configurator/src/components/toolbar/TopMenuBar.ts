import type {MenuItemCommandEvent} from 'primevue/menuitem';
import {chooseSchemaFromFile} from '@/components/toolbar/uploadSchema';
import {chooseConfigFromFile} from '@/components/toolbar/uploadConfig';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {useDataStore} from '@/store/dataStore';
import {clearEditor} from '@/components/toolbar/clearContent';
import {generateSampleData} from '@/components/toolbar/createSampleData';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {clearSchemaEditor} from '@/components/toolbar/clearSchema';
import axios from 'axios';
import {schemaCollection} from '@/data/SchemaCollection';

/**
 * Helper class that contains the menu items for the top menu bar.
 */
export class TopMenuBar {
  private schemaItems: {label: string; icon: string; command: () => void}[] = [];
  constructor(public onMenuItemClicked: (event: MenuItemCommandEvent) => void) {
    this.fetchWebSchemas();
  }
  private async fetchWebSchemas(): Promise<void> {
    const schemaStoreURL = 'https://www.schemastore.org/api/json/catalog.json';

    try {
      const response = await axios.get(schemaStoreURL);
      const schemas = response.data.schemas;

      schemas.forEach(schema => {
        this.schemaItems.push({
          label: schema.name,
          icon: 'pi pi-fw pi-code',
          command: () => this.selectSchema(schema.url),
        });
      });
    } catch (error) {
      console.error('Error fetching web schemas:', error);
    }
  }

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
            label: 'Generate data',
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
            items: schemaCollection.map(schema => ({
              label: schema.label,
              icon: 'pi pi-fw pi-code',
              key: schema.key,
              command: () => this.chooseSchema(schema.key),
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
            command: this.clearSchemaEditor,
          },
          {
            label: 'Upload Schema',
            icon: 'pi pi-fw pi-upload',
            command: this.uploadSchema,
          },
          {
            label: 'Choose schema',
            icon: 'pi pi-fw pi-pencil',
            items: schemaCollection.map(schema => ({
              label: schema.label,
              icon: 'pi pi-fw pi-code',
              key: schema.key,
              command: () => this.chooseSchema(schema.key),
            })),
          },
          {
            label: 'WebSchemas',
            icon: 'pi pi-fw pi-cloud-upload',
            items: this.schemaItems, // Add the fetched schema items to the dropdown menu.
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
  /*private async selectSchema(schemaURL: string): Promise<void> {
    const existingSchemaTitle = useDataStore().schema.title;
    if (existingSchemaTitle) {
      const confirmClear = window.confirm(
        `Selecting a new schema will clear the existing configuration for "${existingSchemaTitle}". Are you sure you want to continue?`
      );
      if (!confirmClear) {
        return; // User canceled, do nothing.
      }
    }
    try {
      // Fetch the schema content from the selected schemaURL.
      const response = await axios.get(schemaURL);
      const schemaContent = response.data;
      useSessionStore().lastChangeResponsible = ChangeResponsible.FileUpload;
      // Update the schemaData in the dataStore with the fetched schema content.
      useDataStore().schemaData = schemaContent;
      useDataStore().fileData = {};
      window.alert('Schema fetched successfully!');
    } catch (error) {
      window.alert('Error fetching schema!! Please try again!!!');
    }
  }*/

  /*private async selectSchema(schemaURL: string): Promise<void> {
    const existingSchemaTitle = useDataStore().schema.title;
    const confirmClear = window.confirm(
      `Do you want to clear current data for "${existingSchemaTitle}" schema?`
    );

    if (!confirmClear) {
      // User chose "No", proceed without clearing the editor content
      try {
        // Fetch the schema content from the selected schemaURL.
        const response = await axios.get(schemaURL);
        const schemaContent = response.data;
        useSessionStore().lastChangeResponsible = ChangeResponsible.FileUpload;
        // Update the schemaData in the dataStore with the fetched schema content.
        useDataStore().schemaData = schemaContent;
        window.alert('Schema fetched successfully!');
      } catch (error) {
        window.alert('Error fetching schema!! Please try again!!!');
      }
    } else {
      // User chose "Yes", clear the editor content and proceed
      try {
        // Fetch the schema content from the selected schemaURL.
        const response = await axios.get(schemaURL);
        const schemaContent = response.data;
        useSessionStore().lastChangeResponsible = ChangeResponsible.FileUpload;
        // Update the schemaData in the dataStore with the fetched schema content.
        useDataStore().schemaData = schemaContent;
        useDataStore().fileData = null; // Clear the editor content here by setting it to null
        window.alert('Schema fetched successfully!');
      } catch (error) {
        window.alert('Error fetching schema!! Please try again!!!');
      }
    }
  }*/
  private async selectSchema(schemaURL: string): Promise<void> {
    const existingSchemaTitle = useDataStore().schema.title;

    // Custom dialog box with options
    const userChoice = window.prompt(
      `Do you want to clear current data for "${existingSchemaTitle} ".\n\nPlease choose an option:\n1. Keep Data\n2. Clear Data`,
      '1' // Default value, 1 represents "Keep Data"
    );

    try {
      // Fetch the schema content from the selected schemaURL.
      const response = await axios.get(schemaURL);
      const schemaContent = response.data;
      useSessionStore().lastChangeResponsible = ChangeResponsible.FileUpload;
      // Update the schemaData in the dataStore with the fetched schema content.
      useDataStore().schemaData = schemaContent;

      if (userChoice === '2') {
        // User chose to clear the data, proceed with clearing the editor content.
        useDataStore().fileData = {};
      }
      window.alert('Schema fetched successfully!');
    } catch (error) {
      window.alert('Error fetching schema!! Please try again!!!');
    }
  }
}
