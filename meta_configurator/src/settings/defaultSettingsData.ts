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
  metaSchema: {
    allowBooleanSchema: false,
    allowMultipleTypes: false,
    showAdditionalPropertiesButton: false,
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
