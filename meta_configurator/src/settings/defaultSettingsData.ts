/**
 * The default settings data.
 */
export const SETTINGS_DATA_DEFAULT = {
  dataFormat: 'json',
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
    rootMustBeObject: true,
  },
  panels: {
    file_editor: [
      {
        panelType: 'text_editor',
        mode: 'file_editor',
      },
      {
        panelType: 'gui_editor',
        mode: 'file_editor',
      },
    ],
    schema_editor: [
      {
        panelType: 'text_editor',
        mode: 'schema_editor',
      },
      {
        panelType: 'gui_editor',
        mode: 'schema_editor',
      },
    ],
    settings: [
      {
        panelType: 'text_editor',
        mode: 'settings',
      },
      {
        panelType: 'gui_editor',
        mode: 'settings',
      },
    ],
  },
};
