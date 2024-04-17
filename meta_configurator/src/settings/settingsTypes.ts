import type {PanelType} from '@/components/panelType';
import type {SessionMode} from '@/store/sessionMode';

export interface SettingsInterfaceRoot {
  guiEditorOnRightSide: boolean;
  dataFormat: DataFormat;
  codeEditor: SettingsInterfaceCodeEditor;
  guiEditor: SettingsInterfaceGuiEditor;
  metaSchema: SettingsInterfaceMetaSchema;
  panels: SettingsInterfacePanels;
}

export interface SettingsInterfaceCodeEditor {
  fontSize: number;
}

export interface SettingsInterfaceGuiEditor {
  maximumDepth: number;
  propertySorting: PropertySorting;
}
export interface SettingsInterfacePanels {
  text_editor: SettingsInterfacePanel[];
  gui_editor: SettingsInterfacePanel[];
  settings: SettingsInterfacePanel[];
}

export interface SettingsInterfacePanel {
  panelType: PanelType;
  mode: SessionMode;
}

export interface SettingsInterfaceMetaSchema {
  showAdditionalPropertiesButton: boolean;
  allowBooleanSchema: boolean;
  allowMultipleTypes: boolean;
  objectTypesComfort: boolean;
  rootMustBeObject: boolean;
}

export enum PropertySorting {
  PRIORITY_ORDER = 'priorityOrder',
  SCHEMA_ORDER = 'schemaOrder',
  DATA_ORDER = 'dataOrder',
}

export enum DataFormat {
  JSON = 'json',
  YAML = 'yaml',
}
