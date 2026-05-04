import {beforeEach, describe, expect, it, vi} from 'vitest';

const openMock = vi.fn();
const onChangeRegistrations: Array<(files: FileList | null) => void> = [];
const resetMock = vi.fn();

vi.mock('@vueuse/core', () => ({
  useFileDialog: vi.fn(() => ({
    open: openMock,
    onChange: (handler: (files: FileList | null) => void) => {
      onChangeRegistrations.push(handler);
    },
    reset: resetMock,
  })),
}));

describe('createLazySingleFileDialog', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    onChangeRegistrations.length = 0;
    vi.useFakeTimers();
  });

  it('reuses one dialog registration and routes selection to the latest handler', async () => {
    const {createLazySingleFileDialog} = await import('@/utility/fileDialogUtils.ts');

    const dialog = createLazySingleFileDialog('.csv');
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    dialog.openForSelection(firstHandler);
    dialog.openForSelection(secondHandler);

    expect(onChangeRegistrations).toHaveLength(1);
    expect(openMock).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(openMock).toHaveBeenCalledTimes(2);

    const files = {0: new File(['a'], 'test.csv'), length: 1} as unknown as FileList;
    onChangeRegistrations[0]!(files);

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith(files);
    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});
