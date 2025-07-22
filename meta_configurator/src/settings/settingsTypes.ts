import type {SessionMode} from '@/store/sessionMode';

export interface SettingsInterfaceRoot {
  settingsVersion: string;
  latestNewsHash: number;
  dataFormat: DataFormat;
  toolbarTitle: string;
  hideSchemaEditor: boolean;
  hideSettings: boolean;
  performance: SettingsInterfacePerformance;
  codeEditor: SettingsInterfaceCodeEditor;
  guiEditor: SettingsInterfaceGuiEditor;
  schemaDiagram: SettingsInterfaceSchemaDiagram;
  documentation: SettingsInterfaceDocumentation;
  metaSchema: SettingsInterfaceMetaSchema;
  panels: SettingsInterfacePanels;
  frontend: SettingsInterfacFrontend;
  backend: SettingsInterfaceBackend;
  rdf: SettingsInterfaceRdf;
  aiIntegration: SettingsInterfaceAiIntegraton;
}

export interface SettingsInterfacePerformance {
  maxDocumentSizeForValidation: number; // in bytes
  maxDocumentSizeForCursorSynchronization: number; // in bytes
  maxDocumentSizeForSchemaInference: number; // in bytes
  minObjectPropertyCountToPreserve: number; // when large document is trimmed, this is minimum count of object properties to be preserved
  maxShownChildrenInGuiEditor: number;
}

export interface SettingsInterfaceCodeEditor {
  fontSize: number;
  tabSize: number;
  showFormatSelector: boolean;
  xml: SettingsCodeEditorXml;
}
export interface SettingsCodeEditorXml {
  attributeNamePrefix: string;
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

export interface SettingsInterfaceDocumentation {
  mergeAllOfs: boolean;
  enumMaxCountToShowWithoutSpoiler: number;
  repeatMultipleOccurrencesInTableOfContents: boolean;
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
