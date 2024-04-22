import type {PanelType} from '@/components/panelType';
import type {SessionMode} from '@/store/sessionMode';

export interface SettingsInterfaceRoot {
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
  file_editor: SettingsInterfacePanel[];
  schema_editor: SettingsInterfacePanel[];
  settings: SettingsInterfacePanel[];
}

export interface SettingsInterfacePanel {
  panelType: PanelType;
  mode: SessionMode;
  size: number;
}

export interface SettingsInterfaceMetaSchema {
  showAdditionalPropertiesButton: boolean;
  allowBooleanSchema: boolean;
  allowMultipleTypes: boolean;
  objectTypesComfort: boolean;
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
