import {nextTick, shallowRef, watch} from 'vue';
import {expect, it, vi} from 'vitest';
import {ManagedData} from '@/data/managedData';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {SessionMode} from '@/store/sessionMode';
import {setCurrentNewsHash} from '../currentNews';

it('notifies the shallow settings store when the current news is dismissed permanently', async () => {
  const settings = shallowRef(
    structuredClone(SETTINGS_DATA_DEFAULT) as SettingsInterfaceRoot
  );
  const settingsData = new ManagedData(settings, SessionMode.Settings);
  const settingsWatcher = vi.fn();
  watch(settings, settingsWatcher);

  setCurrentNewsHash(settingsData);
  await nextTick();

  expect(settings.value.latestNewsHash).not.toBe(SETTINGS_DATA_DEFAULT.latestNewsHash);
  expect(settingsWatcher).toHaveBeenCalledOnce();
});
