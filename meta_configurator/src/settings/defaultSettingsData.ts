/**
 * The default settings data.
 */
export const SETTINGS_DATA_DEFAULT = {
  dataFormat: 'json',
  toolbarTitle: 'MetaConfigurator',
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
    maxAttributesToShow: 8,
    maxEnumValuesToShow: 5,
    moveViewToSelectedElement: true,
    automaticZoomMaxValue: 1,
    automaticZoomMinValue: 0.5,
    mergeAllOfs: true,
    showOptionsPanel: false,
  },
  metaSchema: {
    allowBooleanSchema: false,
    allowMultipleTypes: false,
    objectTypesComfort: false,
  },
  hideSchemaEditor: false,
  panels: {
    data_editor: [
      {
        panelType: 'text_editor',
        mode: 'data_editor',
        size: 50,
      },
      {
        panelType: 'gui_editor',
        mode: 'data_editor',
        size: 50,
      },
    ],
    schema_editor: [
      {
        panelType: 'text_editor',
        mode: 'schema_editor',
        size: 50,
      },
      {
        panelType: 'gui_editor',
        mode: 'schema_editor',
        size: 50,
      },
    ],
    settings: [
      {
        panelType: 'text_editor',
        mode: 'settings',
        size: 50,
      },
      {
        panelType: 'gui_editor',
        mode: 'settings',
        size: 50,
      },
    ],
  },
};
