import type {PanelType} from '@/components/panelType';
import type {SessionMode} from '@/store/sessionMode';

export interface SettingsInterfaceRoot {
  dataFormat: DataFormat;
  toolbarTitle: string;
  hideSchemaEditor: boolean;
  hideSettings: boolean;
  uiColors: {
    schemaEditor: string;
    dataEditor: string;
    settings: string;
  };
  codeEditor: SettingsInterfaceCodeEditor;
  guiEditor: SettingsInterfaceGuiEditor;
  schemaDiagram: SettingsInterfaceSchemaDiagram;
  metaSchema: SettingsInterfaceMetaSchema;
  panels: SettingsInterfacePanels;
  rdf: SettingsInterfaceRdf;
  frontend: SettingsInterfacFrontend;
  backend: SettingsInterfaceBackend;
}

export interface SettingsInterfaceCodeEditor {
  fontSize: number;
  tabSize: number;
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
}

export interface SettingsInterfacePanel {
  panelType: PanelType;
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
}

export interface SettingsInterfaceRdf {
  sparqlEndpointUrl: string;
}

export interface SettingsInterfaceBackend {
  hostname: string;
  port: number;
}

export interface SettingsInterfacFrontend {
  hostname: string;
}
