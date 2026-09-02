import {defineComponent, nextTick} from 'vue';
import {flushPromises, type DOMWrapper} from '@vue/test-utils';
import {vi} from 'vitest';

/** Opens a dialog through its exposed show() and waits until it is rendered. */
export async function openDialog(wrapper: {vm: unknown}): Promise<void> {
  (wrapper.vm as {show: () => void}).show();
  await nextTick();
  await flushPromises();
}

export const DialogStub = defineComponent({
  props: {visible: {type: Boolean, default: false}},
  template: '<div v-if="visible"><slot /></div>',
});

/** Keeps dialog contents mounted so tests can inspect messages after the dialog closes. */
export const PersistentDialogStub = defineComponent({template: '<div><slot /></div>'});

export const ButtonStub = defineComponent({
  props: {
    disabled: {type: Boolean, default: false},
    label: {type: String, default: ''},
  },
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
});

export const SelectStub = defineComponent({
  props: {
    modelValue: {type: [String, Object], default: ''},
    options: {type: Array, default: () => []},
    optionLabel: {type: String, default: 'label'},
    optionValue: {type: String, default: 'value'},
  },
  emits: ['update:modelValue'],
  methods: {
    getOptionLabel(option: Record<string, unknown>) {
      return option[this.optionLabel];
    },
    getOptionValue(option: Record<string, unknown>) {
      return option[this.optionValue];
    },
  },
  template:
    '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="String(getOptionValue(option))" :value="String(getOptionValue(option))">{{ getOptionLabel(option) }}</option></select>',
});

export const SelectButtonStub = defineComponent({
  props: {
    modelValue: {type: String, default: ''},
    options: {type: Array, default: () => []},
    optionLabel: {type: String, default: 'label'},
    optionValue: {type: String, default: 'value'},
    optionDisabled: {type: String, default: 'disabled'},
  },
  emits: ['update:modelValue'],
  methods: {
    getOptionLabel(option: Record<string, unknown>) {
      return option[this.optionLabel];
    },
    getOptionValue(option: Record<string, unknown>) {
      return option[this.optionValue];
    },
    isDisabled(option: Record<string, unknown>) {
      return Boolean(option[this.optionDisabled]);
    },
  },
  template:
    '<div class="select-button-stub"><button v-for="option in options" :key="String(getOptionValue(option))" type="button" :data-option-value="String(getOptionValue(option))" :disabled="isDisabled(option)" @click="$emit(\'update:modelValue\', getOptionValue(option))">{{ getOptionLabel(option) }}</button></div>',
});

export const InputTextStub = defineComponent({
  props: {modelValue: {type: String, default: ''}},
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});

export const TextareaStub = defineComponent({
  props: {modelValue: {type: String, default: ''}},
  emits: ['update:modelValue'],
  template:
    '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});

export const CheckboxStub = defineComponent({
  props: {
    modelValue: {type: [Boolean, Array], default: false},
    binary: {type: Boolean, default: false},
    inputId: {type: String, default: ''},
    value: {type: String, default: ''},
  },
  emits: ['update:modelValue'],
  methods: {
    onChange(event: Event) {
      const checked = (event.target as HTMLInputElement).checked;
      if (this.binary) {
        this.$emit('update:modelValue', checked);
        return;
      }

      const currentValues = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
      const updatedValues = checked
        ? [...currentValues, this.value]
        : currentValues.filter(value => value !== this.value);
      this.$emit('update:modelValue', updatedValues);
    },
  },
  template:
    '<input :id="inputId" type="checkbox" :checked="binary ? !!modelValue : Array.isArray(modelValue) && modelValue.includes(value)" @change="onChange" />',
});

export const InputNumberStub = defineComponent({
  props: {
    modelValue: {type: Number, default: 0},
    inputId: {type: String, default: ''},
  },
  emits: ['update:modelValue'],
  template:
    '<input :id="inputId" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
});

export const MessageStub = defineComponent({template: '<div class="message"><slot /></div>'});
export const DividerStub = defineComponent({template: '<hr />'});
export const PanelStub = defineComponent({template: '<div><slot name="header" /><slot /></div>'});
export const SlotStub = defineComponent({template: '<div><slot /></div>'});
export const EmptyStub = defineComponent({template: '<div />'});

export type MockAceEditor = {
  container: {innerHTML: string};
  destroy: ReturnType<typeof vi.fn>;
  getSession: () => {
    setMode: ReturnType<typeof vi.fn>;
    setUseWorker: ReturnType<typeof vi.fn>;
  };
  getValue: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  setValue: ReturnType<typeof vi.fn>;
  state: {currentValue: string};
};

export function createMockAceEditor(): MockAceEditor {
  const state = {currentValue: ''};
  const session = {setMode: vi.fn(), setUseWorker: vi.fn()};

  return {
    container: {innerHTML: ''},
    destroy: vi.fn(),
    getSession: () => session,
    getValue: vi.fn(() => state.currentValue),
    on: vi.fn(),
    setValue: vi.fn((value: string) => {
      state.currentValue = value;
    }),
    state,
  };
}

type ButtonContainer = {
  findAll(selector: string): DOMWrapper<Element>[];
};

export function findButtonByText(wrapper: ButtonContainer, text: string): DOMWrapper<Element> {
  const matchingButton = wrapper.findAll('button').find(button => button.text().includes(text));
  if (!matchingButton) {
    throw new Error(`Could not find a button containing "${text}".`);
  }
  return matchingButton;
}
