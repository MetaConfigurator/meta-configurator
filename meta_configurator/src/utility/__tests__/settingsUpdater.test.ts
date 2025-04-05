import {describe, expect, it, vi} from 'vitest';
import {ref} from 'vue';

// avoid constructing useDataLink store through imports, it is not required for this component
vi.mock('@/data/useDataLink', () => ({
  getSchemaForMode: vi.fn(),
  getDataForMode: vi.fn(),
  useCurrentData: vi.fn(),
  useCurrentSchema: vi.fn(),
  getUserSelectionForMode: vi.fn(),
  getValidationForMode: vi.fn(),
  getSessionForMode: vi.fn(),
}));

// mock dataSource useDataSource
vi.mock('@/data/dataSource', () => ({
  useDataSource: vi.fn(() => ({
    settingsData: ref({}),
    data: ref({}),
    schema: ref({}),
    session: ref({}),
    validation: ref({}),
    userSelection: ref({}),
  })),
}));

// mock panelTypeRegistry
vi.mock('@/components/panels/panelTypeRegistry', () => ({
  panelTypeRegistry: {
    getPanelTypeNames: vi.fn(() => ['textEditor', 'guiEditor', 'schemaDiagram']),
  },
}));

import {addDefaultsForMissingFields, fixPanels} from '../settingsUpdater';

describe('test settings updater', () => {
  let userSettings: any = {
    a: {
      b: {
        c: 5,
      },
    },
    panels: {
      dataEditor: [
        {
          panelType: 'textEditor',
          mode: 'dataEditor',
          size: 50,
        },
      ],
      schemaEditor: [
        {
          panelType: 'schemaDiagram',
          mode: 'schemaEditor',
          size: 33,
        },
      ],
      settings: [
        {
          panelType: 'invalidEditor',
          mode: 'settings',
          size: 50,
        },
      ],
    },
  };

  let defaultSettings: any = {
    a: {
      b: {
        c: 1,
        d: 2,
      },
      e: {
        f: 3,
        g: 4,
      },
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
          panelType: 'schemaDiagram',
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
    },
  };

  it('test addDefaultsForMissingFields', () => {
    const userFile = structuredClone(userSettings);
    const defaultsFile = structuredClone(defaultSettings);

    addDefaultsForMissingFields(userFile, defaultsFile);

    expect(userFile).toEqual({
      a: {
        b: {
          c: 5,
          d: 2,
        },
        e: {
          f: 3,
          g: 4,
        },
      },
      panels: {
        dataEditor: [
          {
            panelType: 'textEditor',
            mode: 'dataEditor',
            size: 50,
          },
        ],
        schemaEditor: [
          {
            panelType: 'schemaDiagram',
            mode: 'schemaEditor',
            size: 33,
          },
        ],
        settings: [
          {
            panelType: 'invalidEditor',
            mode: 'settings',
            size: 50,
          },
        ],
      },
    });
  });

  it('test fixPanels', () => {
    const userFile = structuredClone(userSettings);
    const defaultsFile = structuredClone(defaultSettings);

    fixPanels(userFile, defaultsFile);

    // if panels are messed up, the default panels are used instead for all modes
    expect(userFile).toEqual({
      a: {
        b: {
          c: 5,
        },
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
            panelType: 'schemaDiagram',
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
      },
    });
  });
});
