import {openUploadFileDialog, openUploadSchemaDialog} from '@/components/toolbar/uploadFile';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {openClearCurrentFileDialog, openClearSchemaDialog} from '@/components/toolbar/clearFile';
import {useSessionStore} from '@/store/sessionStore';
import {ref} from 'vue';
import type {SchemaOption} from '@/packaged-schemas/schemaOption';
import {openGenerateDataDialog} from '@/components/toolbar/createSampleData';
import {getDataForMode, useCurrentData, useCurrentSchema} from '@/data/useDataLink';
import {useDataSource} from '@/data/dataSource';
import {SessionMode} from '@/store/sessionMode';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import {useSettings} from '@/settings/useSettings';
import {PanelType} from '@/components/panelType';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';

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

  public getDataEditorMenuItems(settings: SettingsInterfaceRoot) {
    return [
      {
        label: 'New Data...',
        icon: 'fa-regular fa-file',
        items: [
          {
            label: 'Clear Data',
            icon: 'fa-regular fa-file',
            command: openClearCurrentFileDialog,
          },
          {
            label: 'Generate Data...',
            icon: 'fa-solid fa-gears',
            command: openGenerateDataDialog,
            disabled: true, // currently not working in the deployed version
          },
        ],
      },
      {
        label: 'Open Data',
        icon: 'fa-regular fa-folder-open',
        command: () => openUploadFileDialog(getDataForMode(SessionMode.DataEditor)),
      },
      {
        label: 'Download Data',
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

  public getSchemaEditorMenuItems(settings: SettingsInterfaceRoot) {
    let result = [
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
      {
        separator: true,
      },
    ];

    // toggle between showing and hiding the text editor
    result.push(
      this.generateTogglePanelButton(
        SessionMode.SchemaEditor,
        PanelType.TextEditor,
        SessionMode.SchemaEditor,
        'fa-solid fa-text-slash',
        'fa-solid fa-text-slash',
        'schema text editor'
      )
    );

    // toggle between showing and hiding the GUI editor
    result.push(
      this.generateTogglePanelButton(
        SessionMode.SchemaEditor,
        PanelType.GuiEditor,
        SessionMode.SchemaEditor,
        'fa-solid fa-wrench',
        'fa-solid fa-wrench',
        'schema GUI editor'
      )
    );

    // toggle between showing and hiding the GUI preview
    result.push(
      this.generateTogglePanelButton(
        SessionMode.SchemaEditor,
        PanelType.GuiEditor,
        SessionMode.DataEditor,
        'fa-regular fa-eye',
        'fa-solid fa-eye',
        'preview of resulting GUI'
      )
    );

    // toggle between showing and hiding the schema diagram
    result.push(
      this.generateTogglePanelButton(
        SessionMode.SchemaEditor,
        PanelType.SchemaDiagram,
        SessionMode.DataEditor,
        'fa-solid fa-diagram-project',
        'fa-solid fa-diagram-project',
        'schema diagram'
      )
    );

    result.push({
      separator: true,
    });

    // toggle between advanced and simple schema options
    if (
      !useSettings().metaSchema.allowBooleanSchema ||
      !useSettings().metaSchema.allowMultipleTypes ||
      useSettings().metaSchema.objectTypesComfort ||
      !useSettings().metaSchema.showAdditionalPropertiesButton
    ) {
      result.push({
        label: 'Enable advanced schema options',
        icon: 'fa-solid fa-gear',
        command: () => {
          const metaSchema = useSettings().metaSchema;
          metaSchema.allowBooleanSchema = true;
          metaSchema.allowMultipleTypes = true;
          metaSchema.objectTypesComfort = false;
          metaSchema.showAdditionalPropertiesButton = true;
        },
      });
    } else {
      result.push({
        label: 'Disable advanced schema options',
        icon: 'fa-solid fa-gear',
        command: () => {
          const metaSchema = useSettings().metaSchema;
          metaSchema.allowBooleanSchema = false;
          metaSchema.allowMultipleTypes = false;
          // do not activate objectTypesComfort, because many features are not compatible with it
          // metaSchema.objectTypesComfort = true;
          metaSchema.showAdditionalPropertiesButton = false;
        },
      });
    }

    return result;
  }

  private generateTogglePanelButton(
    buttonMode: SessionMode,
    panelType: PanelType,
    panelMode: SessionMode,
    iconNameEnabled: string,
    iconNameDisabled: string,
    description: string
  ) {
    if (
      useSettings().panels[buttonMode].find(
        panel => panel.panelType === panelType && panel.mode === panelMode
      )
    ) {
      return {
        label: `Hide ${description}`,
        icon: iconNameDisabled,
        command: () => {
          const panels = useSettings().panels;
          panels[buttonMode] = panels[buttonMode].filter(
            panel => !(panel.panelType === panelType && panel.mode === panelMode)
          );
        },
      };
    } else {
      return {
        label: `Show ${description}`,
        icon: iconNameEnabled,
        command: () => {
          const panels = useSettings().panels;
          panels[buttonMode].push({
            panelType: panelType,
            mode: panelMode,
            size: 40,
          });
        },
      };
    }
  }

  public getSettingsMenuItems(settings: SettingsInterfaceRoot) {
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
      {
        separator: true,
      },
      {
        label: 'Restore default settings',
        icon: 'fa-solid fa-trash-arrow-up',
        command: () => {
          getDataForMode(SessionMode.Settings).setData(structuredClone(SETTINGS_DATA_DEFAULT));
        },
        key: 'settings_restore',
      },
    ];
  }
}
