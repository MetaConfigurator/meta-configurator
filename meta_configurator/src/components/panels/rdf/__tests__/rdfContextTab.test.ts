import {describe, expect, it, vi} from 'vitest';
import {computed, defineComponent, isProxy, ref} from 'vue';
import {mount} from '@vue/test-utils';
import Ajv2020 from 'ajv/dist/2020';
import {defaultJsonLdSchema} from '@/components/panels/rdf/rdfUtils';
import {SessionMode} from '@/store/sessionMode';

describe('defaultJsonLdSchema', () => {
  const ajv = new Ajv2020({strict: false});
  const validate = ajv.compile(defaultJsonLdSchema);

  it('accepts strings, objects, and arrays of strings or objects', () => {
    expect(validate('https://schema.org')).toBe(true);
    expect(
      validate({
        schema: 'https://schema.org/',
        name: {
          '@id': 'schema:name',
          '@type': '@id',
        },
      })
    ).toBe(true);
    expect(validate(['https://schema.org', {schema: 'https://schema.org/'}])).toBe(true);
  });

  it('rejects arbitrary primitive types for context entries', () => {
    expect(validate({schema: 42})).toBe(false);
    expect(validate({name: {'@type': true}})).toBe(false);
    expect(validate(['https://schema.org', 42])).toBe(false);
  });
});

describe('RdfContextTab', () => {
  it('ignores zoom events from the properties panel', async () => {
    vi.resetModules();

    const updateCurrentPath = vi.fn();
    const updateCurrentSelectedElement = vi.fn();
    const dataRef = ref({'@context': {schema: 'https://schema.org/'}});

    vi.doMock('@/data/useDataLink', () => ({
      getDataForMode: () => ({
        data: dataRef,
        dataAt: (path: string[]) =>
          path[0] === '@context' ? dataRef.value['@context'] : undefined,
        setDataAt: vi.fn(),
        removeDataAt: vi.fn(),
      }),
      getSessionForMode: () => ({
        currentPath: ref(['@context']),
        updateCurrentPath,
        updateCurrentSelectedElement,
      }),
    }));

    vi.doMock('@/components/panels/rdf/rdfStoreManager', () => ({
      rdfStoreManager: {
        parseErrors: ref([]),
      },
    }));

    const PropertiesPanelStub = defineComponent({
      name: 'PropertiesPanel',
      emits: ['zoom_into_path'],
      template: `
        <button class="zoom-button" @click="$emit('zoom_into_path', ['schema'])">
          Zoom
        </button>
      `,
    });

    const RdfContextTab = (await import('@/components/panels/rdf/rdf-authoring/RdfContextTab.vue'))
      .default;

    const wrapper = mount(RdfContextTab, {
      props: {
        sessionMode: SessionMode.DataEditor,
        dataIsUnparsable: false,
        dataIsInJsonLd: true,
      },
      global: {
        stubs: {
          PropertiesPanel: PropertiesPanelStub,
        },
      },
    });

    await wrapper.get('.zoom-button').trigger('click');

    expect(updateCurrentPath).not.toHaveBeenCalled();
    expect(updateCurrentSelectedElement).not.toHaveBeenCalled();
  });

  it('passes plain currentData to the properties panel', async () => {
    vi.resetModules();

    const dataRef = ref({
      '@context': {
        schema: 'https://schema.org/',
      },
    });
    let receivedIsProxy: boolean | undefined;

    vi.doMock('@/data/useDataLink', () => ({
      getDataForMode: () => ({
        data: computed(() => dataRef.value),
        dataAt: (path: string[]) =>
          path[0] === '@context' ? dataRef.value['@context'] : undefined,
        setDataAt: vi.fn(),
        removeDataAt: vi.fn(),
      }),
      getSessionForMode: () => ({
        currentPath: ref(['@context']),
        updateCurrentPath: vi.fn(),
        updateCurrentSelectedElement: vi.fn(),
      }),
    }));

    vi.doMock('@/components/panels/rdf/rdfStoreManager', () => ({
      rdfStoreManager: {
        parseErrors: ref([]),
      },
    }));

    const PropertiesPanelStub = defineComponent({
      name: 'PropertiesPanel',
      props: {
        currentData: {
          type: Object,
          required: false,
        },
      },
      setup(props) {
        receivedIsProxy = isProxy(props.currentData);
        return () => null;
      },
    });

    const RdfContextTab = (await import('@/components/panels/rdf/rdf-authoring/RdfContextTab.vue'))
      .default;

    mount(RdfContextTab, {
      props: {
        sessionMode: SessionMode.DataEditor,
        dataIsUnparsable: false,
        dataIsInJsonLd: true,
      },
      global: {
        stubs: {
          PropertiesPanel: PropertiesPanelStub,
        },
      },
    });

    expect(receivedIsProxy).toBe(false);
  });
});
