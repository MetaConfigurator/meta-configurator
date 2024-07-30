/**
 * The default settings data.
 */
export const SETTINGS_DATA_DEFAULT = {
  dataFormat: 'json',
  toolbarTitle: 'MetaConfigurator',
  hideSchemaEditor: false,
  hideSettings: false,
  uiColors: {
    schemaEditor: 'olivedrab',
    dataEditor: 'black',
    settings: 'darkmagenta',
  },
  codeEditor: {
    fontSize: 14,
    tabSize: 2,
  },
  guiEditor: {
    maximumDepth: 20,
    propertySorting: 'schemaOrder',
  },
  schemaDiagram: {
    vertical: true,
    showAttributes: true,
    showEnumValues: true,
    maxAttributesToShow: 30,
    maxEnumValuesToShow: 10,
    moveViewToSelectedElement: true,
    automaticZoomMaxValue: 1,
    automaticZoomMinValue: 0.5,
    mergeAllOfs: true,
    editMode: false,
  },
  metaSchema: {
    allowBooleanSchema: false,
    allowMultipleTypes: false,
    objectTypesComfort: false,
    markMoreFieldsAsAdvanced: true,
    showAdditionalPropertiesButton: false,
    showJsonLdFields: false,
  },
  panels: {
    dataEditor: [
      {
        panelType: 'textEditor',
        mode: 'dataEditor',
        size: 50,
      },
      {
        panelType: 'guiEditor',
        mode: 'dataEditor',
        size: 50,
      },
    ],
    schemaEditor: [
      {
        panelType: 'textEditor',
        mode: 'schemaEditor',
        size: 50,
      },
      {
        panelType: 'guiEditor',
        mode: 'schemaEditor',
        size: 50,
      },
    ],
    settings: [
      {
        panelType: 'textEditor',
        mode: 'settings',
        size: 50,
      },
      {
        panelType: 'guiEditor',
        mode: 'settings',
        size: 50,
      },
    ],
  },
  rdf: {
    sparqlEndpointUrl: 'https://dbpedia.org/sparql',
  },
  frontend: {
    hostname: 'http://metaconfigurator.informatik.uni-stuttgart.de',
  },
  backend: {
    hostname: 'http://metaconfigurator.informatik.uni-stuttgart.de',
    port: 5000,
  },
};
