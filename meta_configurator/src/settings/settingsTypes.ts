import type {PanelType} from '@/components/panelType';
import type {SessionMode} from '@/store/sessionMode';

export interface SettingsInterfaceRoot {
  toolbarTitle: string;
  dataFormat: DataFormat;
  codeEditor: SettingsInterfaceCodeEditor;
  guiEditor: SettingsInterfaceGuiEditor;
  schemaDiagram: SettingsInterfaceSchemaDiagram;
  metaSchema: SettingsInterfaceMetaSchema;
  hideSchemaEditor: boolean;
  panels: SettingsInterfacePanels;
  rdf: SettingsInterfaceRdf;
}

export interface SettingsInterfaceCodeEditor {
  fontSize: number;
}

export interface SettingsInterfaceGuiEditor {
  maximumDepth: number;
  propertySorting: PropertySorting;
}

export interface SettingsInterfaceSchemaDiagram {
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
  data_editor: SettingsInterfacePanel[];
  schema_editor: SettingsInterfacePanel[];
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
