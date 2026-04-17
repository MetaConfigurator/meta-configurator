import {describe, expect, it, vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineComponent} from 'vue';
import {flushPromises, mount} from '@vue/test-utils';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(dirname, 'fixtures');

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf-8');
}

async function waitUntil(predicate: () => boolean, timeoutMs = 2500) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out while waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

describe('ImportTurtleDialog', () => {
  it('imports Turtle file content and writes converted JSON-LD to current data', async () => {
    vi.resetModules();

    const inputTurtle = readFixture('input.ttl');
    const expectedJson = JSON.parse(readFixture('expected.json'));

    const setDataMock = vi.fn();
    const toastAddMock = vi.fn();

    vi.doMock('@/data/useDataLink', () => ({
      useCurrentData: () => ({
        setData: setDataMock,
      }),
    }));

    vi.doMock('@/utility/toastService', () => ({
      toastService: {
        add: toastAddMock,
      },
    }));

    const requestUploadFileToRefMock = vi.fn((resultString: {value: string}) => {
      resultString.value = inputTurtle;
    });
    const turtleToJsonLDMock = vi.fn().mockResolvedValue(expectedJson);

    vi.doMock('@/components/toolbar/dialogs/turtle-import/importTurtleUtils', () => {
      return {
        requestUploadFileToRef: requestUploadFileToRefMock,
        turtleToJsonLD: turtleToJsonLDMock,
      };
    });

    const ImportTurtleDialog = (
      await import('@/components/toolbar/dialogs/turtle-import/ImportTurtleDialog.vue')
    ).default;

    const DialogStub = defineComponent({
      props: {
        visible: {
          type: Boolean,
          default: false,
        },
      },
      emits: ['update:visible'],
      template: '<div><slot /></div>',
    });

    const ButtonStub = defineComponent({
      props: {
        label: {
          type: String,
          default: '',
        },
        disabled: {
          type: Boolean,
          default: false,
        },
      },
      emits: ['click'],
      template:
        '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    });

    const MessageStub = defineComponent({
      template: '<div><slot /></div>',
    });

    const wrapper = mount(ImportTurtleDialog, {
      global: {
        stubs: {
          Dialog: DialogStub,
          Button: ButtonStub,
          Message: MessageStub,
        },
      },
    });

    await wrapper.get('button').trigger('click');
    await flushPromises();
    await waitUntil(() => setDataMock.mock.calls.length > 0);

    expect(requestUploadFileToRefMock).toHaveBeenCalledTimes(1);
    expect(turtleToJsonLDMock).toHaveBeenCalledWith(inputTurtle);
    expect(setDataMock).toHaveBeenCalledTimes(1);
    expect(setDataMock.mock.calls[0]?.[0]).toEqual(expectedJson);

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'info',
        summary: 'Successful',
      })
    );
  });
});
