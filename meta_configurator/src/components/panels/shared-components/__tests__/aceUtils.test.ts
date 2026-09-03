import {nextTick, shallowRef} from 'vue';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {setupAceMode, setupAceProperties} from '../aceUtils';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import type {Editor} from 'brace';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';

function editorDouble() {
  const session = {
    setMode: vi.fn(),
    setTabSize: vi.fn(),
  };
  const editor = {
    $blockScrolling: 0,
    getSession: () => session,
    setOptions: vi.fn(),
    setShowPrintMargin: vi.fn(),
    setTheme: vi.fn(),
    setFontSize: vi.fn(),
  } as unknown as Editor;

  return {editor, session};
}

describe('Ace settings reactivity', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the editor when nested settings in the shallow store change', async () => {
    vi.useFakeTimers();
    const settings = shallowRef(
      structuredClone(SETTINGS_DATA_DEFAULT) as SettingsInterfaceRoot
    );
    const settingsData = new ManagedData(settings, SessionMode.Settings);
    const {editor, session} = editorDouble();

    const stopMode = setupAceMode(editor, settings);
    const stopProperties = setupAceProperties(editor, settings);
    vi.runAllTimers();

    expect(session.setMode).toHaveBeenLastCalledWith('ace/mode/json');
    expect(session.setTabSize).toHaveBeenLastCalledWith(2);
    expect(editor.setFontSize).toHaveBeenLastCalledWith('14px');

    settingsData.setDataAt(['dataFormat'], 'yaml');
    settingsData.setDataAt(['textEditor', 'tabSize'], 4);
    settingsData.setDataAt(['textEditor', 'fontSize'], 18);
    await nextTick();

    expect(session.setMode).toHaveBeenLastCalledWith('ace/mode/yaml');
    expect(session.setTabSize).toHaveBeenLastCalledWith(4);
    expect(editor.setFontSize).toHaveBeenLastCalledWith('18px');

    stopMode();
    stopProperties();
  });
});
