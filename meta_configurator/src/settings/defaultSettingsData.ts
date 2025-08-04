/**
 * The default settings data.
 */
export const SETTINGS_DATA_DEFAULT = {
  settingsVersion: '1.0.3',
  latestNewsHash: 0,
  dataFormat: 'json',
  toolbarTitle: 'MetaConfigurator',
  hideSchemaEditor: false,
  hideSettings: false,
  performance: {
    maxDocumentSizeForValidation: 1024000, // 1 MiB
    maxDocumentSizeForCursorSynchronization: 1240000, // 1 MiB
    maxDocumentSizeForSchemaInference: 40960, // 40 KiB
    minObjectPropertyCountToPreserve: 16, // when large document is trimmed, this is minimum count of object properties to be preserved
    maxShownChildrenInGuiEditor: 50,
  },
  codeEditor: {
    fontSize: 14,
    tabSize: 2,
    showFormatSelector: true,
    xml: {
      attributeNamePrefix: '_',
    },
  },
  guiEditor: {
    maximumDepth: 20,
    propertySorting: 'schemaOrder',
    hideAddPropertyButton: true,
    showBorderAroundInputFields: true,
    showSchemaTitleAsHeader: true,
  },
  schemaDiagram: {
    editMode: true,
    vertical: true,
    showAttributes: true,
    showEnumValues: true,
    maxAttributesToShow: 30,
    maxEnumValuesToShow: 10,
    moveViewToSelectedElement: false,
    automaticZoomMaxValue: 1,
    automaticZoomMinValue: 0.5,
    mergeAllOfs: false,
  },
  documentation: {
    mergeAllOfs: true,
    enumMaxCountToShowWithoutSpoiler: 10,
    repeatMultipleOccurrencesInTableOfContents: true,
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
        size: 33,
      },
      {
        panelType: 'schemaDiagram',
        mode: 'schemaEditor',
        size: 33,
      },
      {
        panelType: 'guiEditor',
        mode: 'schemaEditor',
        size: 33,
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
    hidden: ['debug', 'test'],
  },
  frontend: {
    hostname:
      import.meta.env.VITE_FRONTEND_HOSTNAME ||
      'https://metaconfigurator.github.io/meta-configurator',
  },
  backend: {
    hostname: 'https://metaconfigurator.informatik.uni-stuttgart.de',
  },
  rdf: {
    sparqlEndpointUrl: 'https://dbpedia.org/sparql',
  },
  aiIntegration: {
    model: 'gpt-4o-mini',
    maxTokens: 5000,
    temperature: 0.0,
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
};
