import {describe, expect, it, vi} from 'vitest';
import {ref} from 'vue';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';

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

import {
  addDefaultsForMissingFields,
  fixPanels,
  updateSettingsWithDefaults,
} from '../settingsUpdater';

describe('test settings updater', () => {
  let userSettings: any = {
    a: {
      b: {
        c: 5,
      },
    },
    schemaDiagram: {},
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
    schemaDiagram: {
      showNullableCheckbox: true,
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
    const schema: TopLevelSchema = {
      type: 'object',
      required: ['a', 'schemaDiagram', 'panels'],
      properties: {
        a: {
          type: 'object',
          required: ['b'],
          properties: {
            b: {
              type: 'object',
              required: ['c'],
              properties: {
                c: {type: 'number'},
                d: {type: 'number'},
              },
            },
            e: {
              type: 'object',
              required: ['f'],
              properties: {
                f: {type: 'number'},
                g: {type: 'number'},
              },
            },
          },
        },
        schemaDiagram: {
          type: 'object',
          properties: {
            showNullableCheckbox: {type: 'boolean'},
          },
        },
        panels: {
          type: 'object',
          required: ['dataEditor', 'schemaEditor', 'settings'],
          properties: {
            dataEditor: {type: 'array'},
            schemaEditor: {type: 'array'},
            settings: {type: 'array'},
          },
        },
      },
    };

    addDefaultsForMissingFields(userFile, defaultsFile, schema, userFile);

    expect(userFile).toEqual({
      a: {
        b: {
          c: 5,
        },
      },
      schemaDiagram: {},
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
      schemaDiagram: {},
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

  it('resets existing 1.0.4 AI settings to the 1.0.5 Uni Stuttgart relay preset', () => {
    const userFile = {
      settingsVersion: '1.0.4',
      panels: {
        dataEditor: [],
        schemaEditor: [],
        settings: [],
        hidden: [],
      },
      backend: {
        hostname: 'https://old.example.org',
      },
      aiIntegration: {
        model: 'gpt-4o-mini',
        temperature: 0,
        backend: {
          endpoint: 'https://api.openai.com/v1/',
        },
      },
    };

    const defaultsFile = {
      settingsVersion: '1.0.5',
      panels: {
        dataEditor: [],
        schemaEditor: [],
        settings: [],
        hidden: [],
      },
      backend: {
        snapshotSharingUrl: 'https://metaconfigurator.informatik.uni-stuttgart.de',
        schemaConverterUrl: 'https://metaconfigurator.informatik.uni-stuttgart.de/schema-converter',
      },
      aiIntegration: {
        model: 'alias-fast',
        max_tokens: 5000,
        temperature: 0,
        backend: {
          relay: 'https://metaconfigurator.informatik.uni-stuttgart.de/relay',
          endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/',
        },
      },
    };

    updateSettingsWithDefaults(userFile, defaultsFile);

    expect(userFile.settingsVersion).toBe('1.0.5');
    expect(userFile.backend).toEqual({
      snapshotSharingUrl: 'https://metaconfigurator.informatik.uni-stuttgart.de',
      schemaConverterUrl: 'https://metaconfigurator.informatik.uni-stuttgart.de/schema-converter',
    });
    expect(userFile.aiIntegration).toEqual({
      model: 'alias-fast',
      max_tokens: 5000,
      temperature: 0.0,
      backend: {
        relay: 'https://metaconfigurator.informatik.uni-stuttgart.de/relay',
        endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/',
      },
    });
  });

  it('does not force relay defaults back into a direct AI endpoint config', () => {
    const userFile = {
      settingsVersion: '1.0.5',
      panels: {
        dataEditor: [],
        schemaEditor: [],
        settings: [],
        hidden: [],
      },
      aiIntegration: {
        model: 'gpt-4o-mini',
        temperature: 0,
        backend: {
          endpoint: 'https://api.openai.com/v1/',
        },
      },
    };

    const defaultsFile = {
      settingsVersion: '1.0.5',
      panels: {
        dataEditor: [],
        schemaEditor: [],
        settings: [],
        hidden: [],
      },
      aiIntegration: {
        model: 'alias-fast',
        temperature: 0,
        backend: {
          relay: 'https://metaconfigurator.informatik.uni-stuttgart.de/relay',
          endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/',
        },
      },
    };

    updateSettingsWithDefaults(userFile, defaultsFile);

    expect(userFile.settingsVersion).toBe('1.0.5');
    expect(userFile.aiIntegration.backend).toEqual({
      endpoint: 'https://api.openai.com/v1/',
    });
    expect(userFile.aiIntegration.model).toBe('gpt-4o-mini');
  });

  it('resets customized 1.0.3 AI settings while bumping to 1.0.5', () => {
    const userFile = {
      settingsVersion: '1.0.3',
      panels: {
        dataEditor: [],
        schemaEditor: [],
        settings: [],
        hidden: [],
      },
      aiIntegration: {
        model: 'gpt-4o',
        max_tokens: 1234,
        temperature: 0.2,
        backend: {
          endpoint: 'https://api.openai.com/v1/',
        },
      },
    };

    const defaultsFile = {
      settingsVersion: '1.0.5',
      panels: {
        dataEditor: [],
        schemaEditor: [],
        settings: [],
        hidden: [],
      },
      aiIntegration: {
        model: 'alias-fast',
        max_tokens: 5000,
        temperature: 0.0,
        backend: {
          relay: 'https://metaconfigurator.informatik.uni-stuttgart.de/relay',
          endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/',
        },
      },
    };

    updateSettingsWithDefaults(userFile, defaultsFile);

    expect(userFile.settingsVersion).toBe('1.0.5');
    expect(userFile.aiIntegration).toEqual({
      model: 'alias-fast',
      max_tokens: 5000,
      temperature: 0.0,
      backend: {
        relay: 'https://metaconfigurator.informatik.uni-stuttgart.de/relay',
        endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/',
      },
    });
  });
});
