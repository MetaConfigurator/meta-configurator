import {openUploadFileDialog} from '@/components/toolbar/uploadFile';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {clearCurrentFile} from '@/components/toolbar/clearFile';
import {useSessionStore} from '@/store/sessionStore';
import {openGenerateDataDialog} from '@/components/toolbar/createSampleData';
import {getDataForMode, useCurrentData} from '@/data/useDataLink';
import {useDataSource} from '@/data/dataSource';
import {SessionMode} from '@/store/sessionMode';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import type {MenuItem} from 'primevue/menuitem';
import {panelTypeRegistry} from '@/components/panels/panelTypeRegistry';
import {openImportSchemaDialog} from '@/components/toolbar/importFile';
import {extractInlinedSchemaDefinitions} from '@/components/toolbar/extractSchemaDefinitions';

/**
 * Helper class that contains the menu items for the top menu bar.
 */
export class MenuItems {
  sessionStore = useSessionStore();

  private readonly showSchemaSelectionDialog: () => void;
  private readonly showImportCsvDialog: () => void;
  private readonly showSnapshotDialog: () => void;
  private readonly showCodeGenerationDialog: (schemaMode: boolean) => void;
  private readonly showDataExportDialog: (schemaMode: boolean) => void;
  private readonly showDataMappingDialog: () => void;
  private readonly inferJsonSchemaFromSampleData: () => void;

  constructor(
    showSchemaSelectionDialog: () => void,
    showImportCsvDialog: () => void,
    showSnapshotDialog: () => void,
    showCodeGenerationDialog: (schemaMode: boolean) => void,
    showDataExportDialog: (schemaMode: boolean) => void,
    showDataMappingDialog: () => void,
    inferJsonSchemaFromSampleData: () => void
  ) {
    this.showSchemaSelectionDialog = showSchemaSelectionDialog;
    this.showImportCsvDialog = showImportCsvDialog;
    this.showSnapshotDialog = showSnapshotDialog;
    this.showCodeGenerationDialog = showCodeGenerationDialog;
    this.showDataExportDialog = showDataExportDialog;
    this.showDataMappingDialog = showDataMappingDialog;
    this.inferJsonSchemaFromSampleData = inferJsonSchemaFromSampleData;
  }

  public getDataEditorMenuItems(settings: SettingsInterfaceRoot): MenuItem[] {
    let result: MenuItem[] = [
      {
        label: 'New Data...',
        icon: 'fa-regular fa-file',
        items: [
          {
            label: 'Clear Data',
            icon: 'fa-regular fa-file',
            command: clearCurrentFile,
          },
          {
            label: 'Generate Data...',
            icon: 'fa-solid fa-gears',
            command: openGenerateDataDialog,
            disabled: true,
          },
        ],
      },
      {
        label: 'Open Data',
        icon: 'fa-regular fa-folder-open',
        command: () => openUploadFileDialog(getDataForMode(SessionMode.DataEditor)),
      },
      {
        label: 'Import Data...',
        icon: 'fa-solid fa-file-import',
        items: [
          {
            label: 'Import CSV Data',
            icon: 'fa-solid fa-table',
            command: this.showImportCsvDialog,
          },
        ],
      },
      {
        label: 'Download Data',
        icon: 'fa-solid fa-download',
        command: () =>
          downloadFile(useDataSource().userSchemaData.value.title ?? 'untitled', false),
      },
      {
        label: 'Utility...',
        icon: 'fa-solid fa-wrench',
        key: 'utility',
        items: [
          {
            label: 'Transform Data to match the Schema...',
            icon: 'fa-solid fa-wand-magic-sparkles',
            command: this.showDataMappingDialog,
          },
          {
            label: 'Export Data via Text Template...',
            icon: 'fa-solid fa-file-export',
            command: () => this.showDataExportDialog(false),
          },
        ],
      },
      {
        label: 'Share Snapshot...',
        icon: 'fa-solid fa-share',
        command: this.showSnapshotDialog,
        key: 'snapshot',
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
        disabled: () => !useCurrentData().undoManager.canUndo.value,
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          useCurrentData().undoManager.redo();
        },
        disabled: () => !useCurrentData().undoManager.canRedo.value,
        key: 'redo',
      },
    ];

    if (settings.panels.hidden.includes('aiPrompts')) {
      result = result.filter(menuItem => {
        // exclude the "Utility" menu item
        return !(menuItem.label === 'Utility');
      });
    }

    result.push(...this.generateModeSpecificPanelToggleButtons(SessionMode.DataEditor, settings));

    return result;
  }

  public getSchemaEditorMenuItems(settings: SettingsInterfaceRoot): MenuItem[] {
    let result: MenuItem[] = [
      {
        label: 'New Schema...',
        icon: 'fa-regular fa-file',
        items: [
          {
            label: 'New empty Schema',
            icon: 'fa-regular fa-file',
            command: clearCurrentFile,
          },
          {
            label: 'Infer Schema from Data',
            icon: 'fa-solid fa-wand-magic-sparkles',
            command: this.inferJsonSchemaFromSampleData,
          },
        ],
      },
      {
        label: 'Open JSON Schema...',
        icon: 'fa-regular fa-folder-open',
        command: () => this.showSchemaSelectionDialog(),
      },
      {
        label: 'Insert Schema...',
        icon: 'fa-solid fa-file-import',
        items: [
          {
            label: 'JSON Schema',
            command: openImportSchemaDialog,
          },
        ],
      },
      {
        label: 'Download Schema',
        icon: 'fa-solid fa-download',
        command: () => downloadFile(useDataSource().userSchemaData.value.title ?? 'untitled', true),
      },
      {
        label: 'Utility...',
        icon: 'fa-solid fa-wrench',
        key: 'utility',
        items: [
          {
            label: 'Extract All Inlined Schema Elements',
            icon: 'fa-solid fa-scissors',
            command: extractInlinedSchemaDefinitions,
          },
        ],
      },
      {
        label: 'Generate Source Code...',
        icon: 'fa-solid fa-file-code',
        command: () => this.showCodeGenerationDialog(true),
      },
      {
        label: 'Share Snapshot...',
        icon: 'fa-solid fa-share',
        command: this.showSnapshotDialog,
        key: 'snapshot',
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
        disabled: () => !useCurrentData().undoManager.canUndo.value,
        key: 'schema_undo',
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          useCurrentData().undoManager.redo();
        },
        disabled: () => !useCurrentData().undoManager.canRedo.value,
        key: 'schema_redo',
      },
    ];

    result.push(...this.generateModeSpecificPanelToggleButtons(SessionMode.SchemaEditor, settings));

    result.push({
      position: 'top',
      separator: true,
    });

    // toggle between advanced and simple schema options
    result.push(
      this.generateToggleButton(
        () =>
          settings.metaSchema.allowBooleanSchema &&
          settings.metaSchema.allowMultipleTypes &&
          !settings.metaSchema.markMoreFieldsAsAdvanced,
        () => {
          const metaSchema = settings.metaSchema;
          metaSchema.allowBooleanSchema = true;
          metaSchema.allowMultipleTypes = true;
          metaSchema.markMoreFieldsAsAdvanced = false;
        },
        () => {
          const metaSchema = settings.metaSchema;
          metaSchema.allowBooleanSchema = false;
          metaSchema.allowMultipleTypes = false;
          metaSchema.markMoreFieldsAsAdvanced = true;
          metaSchema.objectTypesComfort = true;
        },
        'fa-solid fa-lock',
        'fa-solid fa-lock-open',
        'Enable advanced schema options',
        'Disable advanced schema options'
      )
    );

    // toggle to activate/deactivate JSON-LD support
    result.push(
      this.generateToggleButton(
        () => settings.metaSchema.showJsonLdFields,
        () => {
          const metaSchema = settings.metaSchema;
          metaSchema.showJsonLdFields = true;
        },
        () => {
          const metaSchema = settings.metaSchema;
          metaSchema.showJsonLdFields = false;
        },
        'fa-solid fa-circle-nodes',
        'fa-solid fa-circle-nodes',
        'Enable JSON-LD fields\n(You can specify the SPARQL endpoint in the settings)',
        'Disable JSON-LD fields'
      )
    );

    return result;
  }

  public getSettingsMenuItems(settings: SettingsInterfaceRoot): MenuItem[] {
    let result: MenuItem[] = [
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
        command: () => downloadFile('metaConfiguratorSettings', false),
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
        disabled: () => !useCurrentData().undoManager.canUndo.value,
        key: 'settings_undo',
      },
      {
        label: 'Redo',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
          useCurrentData().undoManager.redo();
        },
        disabled: () => !useCurrentData().undoManager.canRedo.value,
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

    result.push(...this.generateModeSpecificPanelToggleButtons(SessionMode.Settings, settings));

    return result;
  }

  private generateModeSpecificPanelToggleButtons(
    mode: SessionMode,
    settings: SettingsInterfaceRoot
  ): MenuItem[] {
    let result: MenuItem[] = [];

    for (const panelTypeName of panelTypeRegistry.getPanelTypeNames()) {
      const panelTypeDefinition = panelTypeRegistry.getPanelTypeDefinition(panelTypeName);
      if (
        panelTypeDefinition.supportedModes.includes(mode) &&
        panelTypeDefinition.icon.length > 0 &&
        !settings.panels.hidden.includes(panelTypeName)
      ) {
        // toggle between showing and hiding the panel
        result.push(
          this.generateTogglePanelButton(
            mode,
            panelTypeName,
            mode,
            panelTypeDefinition.icon,
            panelTypeDefinition.icon,
            panelTypeDefinition.label,
            settings
          )
        );
      }
    }

    return result;
  }

  private generateTogglePanelButton(
    buttonMode: SessionMode,
    panelTypeName: string,
    panelMode: SessionMode,
    iconNameEnabled: string,
    iconNameDisabled: string,
    description: string,
    settings: SettingsInterfaceRoot
  ): MenuItem {
    return this.generateToggleButton(
      () =>
        settings.panels[buttonMode].find(
          panel => panel.panelType === panelTypeName && panel.mode === panelMode
        ) !== undefined,
      () => {
        const panels = settings.panels;
        panels[buttonMode].push({
          panelType: panelTypeName,
          mode: panelMode,
          size: 40,
        });
      },
      () => {
        const panels = settings.panels;
        panels[buttonMode] = panels[buttonMode].filter(
          panel => !(panel.panelType === panelTypeName && panel.mode === panelMode)
        );
      },
      iconNameEnabled,
      iconNameDisabled,
      `Show ${description}`,
      `Hide ${description}`
    );
  }

  private generateToggleButton(
    conditionActive: () => boolean,
    actionActivate: () => void,
    actionDeactivate: () => void,
    iconNameEnabled: string,
    iconNameDisabled: string,
    descriptionActivate: string,
    descriptionDeactivate: string
  ): MenuItem {
    if (conditionActive()) {
      return {
        position: 'top',
        label: descriptionDeactivate,
        icon: iconNameDisabled,
        highlighted: true,
        command: actionDeactivate,
      };
    } else {
      return {
        position: 'top',
        label: descriptionActivate,
        icon: iconNameEnabled,
        command: actionActivate,
      };
    }
  }
}
