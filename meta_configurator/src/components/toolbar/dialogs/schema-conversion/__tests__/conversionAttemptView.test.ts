import {describe, expect, it, vi} from 'vitest';
import {defineComponent} from 'vue';
import {mount} from '@vue/test-utils';

// schemaConverterApi reads settings at module load; stub it.
vi.mock('@/settings/useSettings', () => ({
  useSettings: () => ({value: {backend: {schemaConverterUrl: 'http://mock-orchestrator'}}}),
}));
vi.mock('@/utility/toastService', () => ({toastService: {add: vi.fn()}}));

import ConversionAttemptView from '@/components/toolbar/dialogs/schema-conversion/ConversionAttemptView.vue';

const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
});
const IconStub = defineComponent({template: '<i />'});

function step(source: string, target: string, serviceName = 'FlaskApp', converterName = 'conv') {
  return {sourceLanguage: source, targetLanguage: target, serviceName, converterName};
}

function mountView(attempt: any, index = 0) {
  return mount(ConversionAttemptView, {
    props: {attempt, index},
    slots: {actions: '<button class="action-slot">Apply</button>'},
    global: {
      stubs: {Button: ButtonStub, FontAwesomeIcon: IconStub},
      directives: {tooltip: {}},
    },
  });
}

describe('ConversionAttemptView', () => {
  it('renders the result in a code box and the actions slot on success', () => {
    const wrapper = mountView({
      success: true,
      result: '{"title":"Person"}',
      conversionPath: [step('Xsd', 'JsonSchema', 'FlaskApp', 'xsd2js')],
    });

    expect(wrapper.find('.code-container').exists()).toBe(true);
    expect(wrapper.find('.code-container').text()).toContain('{"title":"Person"}');
    expect(wrapper.find('.action-slot').exists()).toBe(true);
    // No error box on success
    expect(wrapper.find('.error-container').exists()).toBe(false);
  });

  it('renders the language nodes and converter names for the whole path', () => {
    const wrapper = mountView({
      success: true,
      result: 'ok',
      conversionPath: [
        step('Xsd', 'MdModels', 'FlaskApp', 'xsd2md'),
        step('MdModels', 'JsonSchema', 'FlaskApp', 'md2js'),
      ],
    });
    const nodes = wrapper.findAll('.lang-node').map(n => n.text());
    // source of step 0, source of step 1 (== target of step 0), and final target
    expect(nodes).toEqual(['XSD', 'MdModels', 'JSON Schema']);
    expect(wrapper.text()).toContain('xsd2md');
    expect(wrapper.text()).toContain('md2js');
  });

  it('shows an error box (not a code box) on failure', () => {
    const wrapper = mountView({
      success: false,
      result: 'some error happened',
      conversionPath: [step('Xsd', 'JsonSchema')],
    });
    expect(wrapper.find('.error-container').exists()).toBe(true);
    expect(wrapper.find('.code-container').exists()).toBe(false);
    expect(wrapper.find('.action-slot').exists()).toBe(false);
  });

  it('highlights the failing edge in red based on the backend failedStepIndex', () => {
    const wrapper = mountView({
      success: false,
      result: 'Conversion failed at step from MdModels to Shex via FlaskApp because of error: boom',
      failedStepIndex: 1,
      conversionPath: [
        step('Xsd', 'MdModels', 'FlaskApp', 'xsd2md'),
        step('MdModels', 'Shex', 'FlaskApp', 'md2shex'),
      ],
    });
    const edges = wrapper.findAll('.path-edge');
    expect(edges).toHaveLength(2);
    // The second edge (MdModels -> Shex) is the one that failed.
    expect(edges[0]!.classes()).not.toContain('edge-failed');
    expect(edges[1]!.classes()).toContain('edge-failed');
  });

  it('does not highlight any edge when the backend did not pinpoint a step', () => {
    const wrapper = mountView({
      success: false,
      result: 'an opaque error with no step info',
      failedStepIndex: null,
      conversionPath: [step('Xsd', 'JsonSchema', 'FlaskApp', 'xsd2js')],
    });
    expect(wrapper.findAll('.edge-failed')).toHaveLength(0);
  });

  it('shows the library name, version and clickable url in the edge tooltip', () => {
    const wrapper = mountView({
      success: true,
      result: 'ok',
      conversionPath: [
        {
          sourceLanguage: 'Xsd',
          targetLanguage: 'JsonSchema',
          serviceName: 'FlaskApp',
          converterName: 'xsd2js',
          library: 'xsd2jsonschema',
          libraryVersion: '0.3.7',
          libraryUrl: 'https://www.npmjs.com/package/xsd2jsonschema',
        },
      ],
    });
    const tooltip = wrapper.find('.edge-tooltip');
    expect(tooltip.exists()).toBe(true);
    expect(tooltip.text()).toContain('xsd2jsonschema');
    expect(tooltip.text()).toContain('v0.3.7');
    const link = tooltip.find('a.tooltip-link');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('https://www.npmjs.com/package/xsd2jsonschema');
  });

  it('falls back to "Library: unknown" when no library metadata is present', () => {
    const wrapper = mountView({
      success: true,
      result: 'ok',
      conversionPath: [step('Xsd', 'JsonSchema', 'FlaskApp', 'xsd2js')],
    });
    const tooltip = wrapper.find('.edge-tooltip');
    expect(tooltip.text()).toContain('Library: unknown');
    expect(tooltip.find('a.tooltip-link').exists()).toBe(false);
  });
});
