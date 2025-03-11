import type {SessionMode} from '@/store/sessionMode';

export interface SettingsInterfaceRoot {
  settingsVersion: string;
  preferencesSelected: boolean;
  dataFormat: DataFormat;
  toolbarTitle: string;
  hideSchemaEditor: boolean;
  hideSettings: boolean;
  codeEditor: SettingsInterfaceCodeEditor;
  guiEditor: SettingsInterfaceGuiEditor;
  schemaDiagram: SettingsInterfaceSchemaDiagram;
  metaSchema: SettingsInterfaceMetaSchema;
  panels: SettingsInterfacePanels;
  frontend: SettingsInterfacFrontend;
  backend: SettingsInterfaceBackend;
  rdf: SettingsInterfaceRdf;
  aiIntegration: SettingsInterfaceAiIntegraton;
}

export interface SettingsInterfaceCodeEditor {
  fontSize: number;
  tabSize: number;
  showFormatSelector: boolean;
}

export interface SettingsInterfaceGuiEditor {
  maximumDepth: number;
  propertySorting: PropertySorting;
  hideAddPropertyButton: boolean;
}

export interface SettingsInterfaceSchemaDiagram {
  editMode: boolean;
  vertical: boolean;
  showAttributes: boolean;
  showEnumValues: boolean;
  maxAttributesToShow: number;
  maxEnumValuesToShow: number;
  moveViewToSelectedElement: boolean;
  automaticZoomMaxValue: number;
  automaticZoomMinValue: number;
  mergeAllOfs: boolean;
}

export interface SettingsInterfacePanels {
  dataEditor: SettingsInterfacePanel[];
  schemaEditor: SettingsInterfacePanel[];
  settings: SettingsInterfacePanel[];
  hidden: string[];
}

export interface SettingsInterfacePanel {
  panelType: string;
  mode: SessionMode;
  size: number;
}

export interface SettingsInterfaceMetaSchema {
  allowBooleanSchema: boolean;
  allowMultipleTypes: boolean;
  objectTypesComfort: boolean;
  markMoreFieldsAsAdvanced: boolean;
  showAdditionalPropertiesButton: boolean;
  showJsonLdFields: boolean;
}

export enum PropertySorting {
  PRIORITY_ORDER = 'priorityOrder',
  SCHEMA_ORDER = 'schemaOrder',
  DATA_ORDER = 'dataOrder',
}

export enum DataFormat {
  JSON = 'json',
  YAML = 'yaml',
  XML = 'xml',
}

export interface SettingsInterfaceBackend {
  hostname: string;
  port: number;
}

export interface SettingsInterfacFrontend {
  hostname: string;
}

export interface SettingsInterfaceRdf {
  sparqlEndpointUrl: string;
}

export interface SettingsInterfaceAiIntegraton {
  model: string;
  maxTokens: number;
  temperature: number;
  endpoint: string;
}
