/**
 * The default settings data.
 */
export const SETTINGS_DATA_DEFAULT = {
  dataFormat: 'json',
  toolbarTitle: 'MetaConfigurator',
  uiColors: {
    schemaEditor: 'olivedrab',
    dataEditor: 'black',
    settings: 'darkmagenta',
  },
  codeEditor: {
    fontSize: 14,
  },
  guiEditor: {
    maximumDepth: 20,
    propertySorting: 'schemaOrder',
  },
  schemaDiagram: {
    vertical: true,
    showAttributes: true,
    showEnumValues: true,
    maxAttributesToShow: 14,
    maxEnumValuesToShow: 10,
    moveViewToSelectedElement: true,
    automaticZoomMaxValue: 1,
    automaticZoomMinValue: 0.5,
    mergeAllOfs: true,
  },
  metaSchema: {
    allowBooleanSchema: false,
    allowMultipleTypes: false,
    objectTypesComfort: false,
    showAdditionalPropertiesButton: false,
    showJsonLdFields: false,
  },
  hideSchemaEditor: false,
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
};
