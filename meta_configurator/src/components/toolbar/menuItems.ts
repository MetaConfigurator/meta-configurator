import {openUploadFileDialog, openUploadSettingsDialog} from '@/components/toolbar/uploadFile';
import {downloadFile} from '@/components/toolbar/downloadFile';
import {clearCurrentFile} from '@/components/toolbar/clearFile';
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
import {resolveSchemaReferences} from '@/components/toolbar/resolveSchemaReferences.ts';
import {bundleSchema} from '@/components/toolbar/bundleSchema.ts';
import {sortSchemaPropertiesAlphabeticallyAction} from '@/components/toolbar/sortSchemaProperties.ts';

/** The dialog-opening callbacks the menu entries trigger, owned by the toolbar component. */
export type MenuItemDialogActions = {
  showSchemaSelectionDialog: () => void;
  showImportCsvDialog: () => void;
  showSnapshotDialog: () => void;
  showCodeGenerationDialog: (schemaMode: boolean) => void;
  showDataExportDialog: (schemaMode: boolean) => void;
  showDataMappingDialog: () => void;
  showDataImportAiDialog: () => void;
  showInferSchemaDialog: () => void;
  showRmlMappingDialog: () => void;
  showImportTurtleDialog: () => void;
  showImportXmlDialog: () => void;
  showXmlExportDialog: () => void;
  showImportSchemaDialog: () => void;
  showExportSchemaDialog: () => void;
  showRefineSchemaDialog: () => void;
};

/** Provides the menu items for the top menu bar. */
export class MenuItems {
  constructor(private readonly dialogActions: MenuItemDialogActions) {}

  public getDataEditorMenuItems(settings: SettingsInterfaceRoot): MenuItem[] {
    let result: MenuItem[] = [
      {
        label: 'New Data / Generate Data...',
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
          },
        ],
      },
      {
        label: 'Open / Import Data...',
        key: 'import-data',
        icon: 'fa-regular fa-folder-open',
        items: [
          {
            label: 'Open JSON/YAML Data',
            icon: 'fa-solid fa-folder-open',
            command: () => openUploadFileDialog(getDataForMode(SessionMode.DataEditor)),
          },
          {
            label: 'Import CSV Data',
            icon: 'fa-solid fa-table',
            command: this.dialogActions.showImportCsvDialog,
          },
          {
            label: 'Import Turtle Data',
            icon: 'fa-solid fa-globe',
            command: this.dialogActions.showImportTurtleDialog,
          },
          {
            label: 'Import XML Data',
            icon: 'fa-solid fa-file-code',
            command: this.dialogActions.showImportXmlDialog,
          },
          {
            label: 'Import Data with AI',
            icon: 'fa-solid fa-robot',
            command: this.dialogActions.showDataImportAiDialog,
          },
        ],
      },
      {
        label: 'Export Data...',
        icon: 'fa-solid fa-file-export',
        items: [
          {
            label: 'Download JSON/YAML Data',
            icon: 'fa-solid fa-download',
            command: () =>
              downloadFile(useDataSource().userSchemaData.value.title ?? 'untitled', false),
          },
          {
            label: 'Export to XML',
            icon: 'fa-solid fa-file-code',
            command: this.dialogActions.showXmlExportDialog,
          },
        ],
      },
      {
        label: 'Utility...',
        icon: 'fa-solid fa-wrench',
        key: 'utility',
        items: [
          {
            label: 'Transform Data to match the Schema...',
            icon: 'fa-solid fa-wand-magic-sparkles',
            command: this.dialogActions.showDataMappingDialog,
          },
          {
            label: 'Export Data via Text Template...',
            icon: 'fa-solid fa-file-export',
            command: () => this.dialogActions.showDataExportDialog(false),
          },
          {
            label: 'Transform JSON Data to JSON-LD',
            icon: 'fa-solid fa-gears',
            command: this.dialogActions.showRmlMappingDialog,
          },
        ],
      },
      {
        label: 'Share Snapshot...',
        icon: 'fa-solid fa-share',
        command: this.dialogActions.showSnapshotDialog,
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
        return menuItem.key !== 'utility';
      });
    }

    result.push(...this.generateModeSpecificPanelToggleButtons(SessionMode.DataEditor, settings));

    return result;
  }

  public getSchemaEditorMenuItems(settings: SettingsInterfaceRoot): MenuItem[] {
    const result: MenuItem[] = [
      {
        label: 'New Schema / Infer Schema...',
        icon: 'fa-regular fa-file',
        key: 'new-schema',
        items: [
          {
            label: 'Clear Schema',
            icon: 'fa-regular fa-file',
            command: clearCurrentFile,
            key: 'clear-schema',
          },
          {
            label: 'Infer Schema from Data...',
            icon: 'fa-solid fa-wand-magic-sparkles',
            command: this.dialogActions.showInferSchemaDialog,
          },
        ],
      },
      {
        label: 'Open / Import Schema...',
        icon: 'fa-regular fa-folder-open',
        key: 'open-import-infer-schema',
        items: [
          {
            label: 'Open Schema...',
            icon: 'fa-solid fa-folder-open',
            command: () => this.dialogActions.showSchemaSelectionDialog(),
          },
          {
            label: 'Insert JSON Schema...',
            icon: 'fa-solid fa-file-import',
            command: openImportSchemaDialog,
          },
          {
            label: 'Import Schema from another format...',
            icon: 'fa-solid fa-file-arrow-down',
            command: this.dialogActions.showImportSchemaDialog,
          },
        ],
      },
      {
        label: 'Export Schema...',
        icon: 'fa-solid fa-file-export',
        key: 'export-schema',
        items: [
          {
            label: 'Download as JSON Schema',
            icon: 'fa-solid fa-download',
            command: () =>
              downloadFile(useDataSource().userSchemaData.value.title ?? 'untitled', true),
          },
          {
            label: 'Export Schema to another format...',
            icon: 'fa-solid fa-file-arrow-up',
            command: this.dialogActions.showExportSchemaDialog,
          },
        ],
      },
      {
        label: 'Utility...',
        icon: 'fa-solid fa-wrench',
        key: 'utility',
        items: [
          {
            label: 'Extract All Inlined Schema Elements into Definitions and use References',
            icon: 'fa-solid fa-scissors',
            command: extractInlinedSchemaDefinitions,
          },
          {
            label: 'Resolve References and Inline all Schema Elements',
            icon: 'fa-solid fa-link',
            command: resolveSchemaReferences,
          },
          {
            label: 'Bundle External References into the same File',
            icon: 'fa-solid fa-file-zipper',
            command: bundleSchema,
          },
          {
            label: 'Sort All Schema Properties Alphabetically',
            icon: 'fa-solid fa-arrow-down-a-z',
            command: sortSchemaPropertiesAlphabeticallyAction,
          },
          {
            label: 'Refine Schema...',
            icon: 'fa-solid fa-wand-magic-sparkles',
            command: this.dialogActions.showRefineSchemaDialog,
          },
        ],
      },
      {
        label: 'Generate Source Code...',
        icon: 'fa-solid fa-file-code',
        command: () => this.dialogActions.showCodeGenerationDialog(true),
      },
      {
        label: 'Share Snapshot...',
        icon: 'fa-solid fa-share',
        command: this.dialogActions.showSnapshotDialog,
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
    const result: MenuItem[] = [
      {
        label: 'Open settings file',
        icon: 'fa-regular fa-folder-open',
        command: openUploadSettingsDialog,
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
    const result: MenuItem[] = [];

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
    mode: SessionMode,
    panelTypeName: string,
    iconName: string,
    description: string,
    settings: SettingsInterfaceRoot
  ): MenuItem {
    return this.generateToggleButton(
      () =>
        settings.panels[mode].find(
          panel => panel.panelType === panelTypeName && panel.mode === mode
        ) !== undefined,
      () => {
        const panels = settings.panels;
        panels[mode].push({
          panelType: panelTypeName,
          mode,
          size: 40,
        });
      },
      () => {
        const panels = settings.panels;
        panels[mode] = panels[mode].filter(
          panel => !(panel.panelType === panelTypeName && panel.mode === mode)
        );
      },
      iconName,
      iconName,
      `Show ${description}`,
      `Hide ${description}`
    );
  }

  private generateToggleButton(
    isActive: () => boolean,
    activate: () => void,
    deactivate: () => void,
    activeIconName: string,
    inactiveIconName: string,
    activationDescription: string,
    deactivationDescription: string
  ): MenuItem {
    if (isActive()) {
      return {
        position: 'top',
        label: deactivationDescription,
        icon: inactiveIconName,
        highlighted: true,
        command: deactivate,
      };
    }
    return {
      position: 'top',
      label: activationDescription,
      icon: activeIconName,
      command: activate,
    };
  }
}
