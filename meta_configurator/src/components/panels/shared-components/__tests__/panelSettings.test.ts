import {describe, it, expect, vi, beforeEach} from 'vitest';
import {mount, flushPromises} from '@vue/test-utils';
import {defineComponent} from 'vue';
import PanelSettings from '../PanelSettings.vue';
import {SessionMode} from '@/store/sessionMode';

vi.mock('@/data/useDataLink', async () => {
  const vue = await import('vue');
  const stubData = {
    setDataAt: vi.fn(),
    removeDataAt: vi.fn(),
    dataAt: vi.fn(),
    unparsedData: vue.ref('clipboard text'),
  };
  const stubSchema = {
    effectiveSchemaAtPath: vi.fn(() => ({
      schema: {
        jsonSchema: {},
      },
    })),
  };

  return {
    getDataForMode: vi.fn(() => stubData),
    getSchemaForMode: vi.fn(() => stubSchema),
  };
});

const PanelStub = defineComponent({
  template: '<div><slot name="icons" /><slot /></div>',
});

const ButtonStub = defineComponent({
  template: '<button type="button" @click="$emit(\'click\')"></button>',
});

const PropertiesPanelStub = defineComponent({
  template: '<div />',
});

describe('PanelSettings', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('copies panel content to the clipboard when the copy button is clicked', async () => {
    const wrapper = mount(PanelSettings, {
      props: {
        panelName: 'Text View',
        panelSettingsPath: [],
        sessionMode: SessionMode.DataEditor,
      },
      global: {
        stubs: {
          Panel: PanelStub,
          Button: ButtonStub,
          PropertiesPanel: PropertiesPanelStub,
        },
      },
    });

    await wrapper.get('button').trigger('click');
    await flushPromises();

    const clipboard = navigator.clipboard as Clipboard;
    expect(clipboard.writeText).toHaveBeenCalledWith('clipboard text');
  });
});
