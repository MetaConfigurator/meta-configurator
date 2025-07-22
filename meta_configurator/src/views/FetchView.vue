<script setup lang="ts">
import {useAppRouter} from '@/router/router';
import {onMounted, ref} from 'vue';
import {useSessionStore} from '@/store/sessionStore';
import {restoreSnapshot} from '@/utility/backend/backendApi';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {useSettings} from '@/settings/useSettings';
import {fetchExternalContent} from '@/utility/fetchExternalContent';
import {updateSettingsWithDefaults, overwriteSettings} from '@/settings/settingsUpdater';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';

defineProps({settings_url: String});

const sessionStore = useSessionStore();
const settings = useSettings();

// Track all asynchronous tasks
const settingsFetched = ref(true); // default true unless overridden
const schemaFetched = ref(true);
const dataFetched = ref(true);
const snapshotFetched = ref(true);

onMounted(() => {
  const userSettings = getDataForMode(SessionMode.Settings).data.value;
  const defaultSettings: any = structuredClone(SETTINGS_DATA_DEFAULT);
  updateSettingsWithDefaults(userSettings, defaultSettings);

  const route = useAppRouter().currentRoute.value;
  const query = route.query;
  let usesCustomSettings = false;
  let skipSchemaDialog = false;

  // SETTINGS
  if ('settings' in query) {
    settingsFetched.value = false;
    const settingsUrl = query.settings as string;
    usesCustomSettings = true;
    fetchExternalContent(settingsUrl)
      .then(res => res.json())
      .then(json => {
        const userSettings = getDataForMode(SessionMode.Settings).data.value;
        overwriteSettings(userSettings, json);
      })
      .finally(() => (settingsFetched.value = true));
  }

  // SCHEMA
  if ('schema' in query) {
    schemaFetched.value = false;
    skipSchemaDialog = true;
    const schemaUrl = query.schema as string;
    fetchExternalContent(schemaUrl)
      .then(res => res.json())
      .then(json => {
        getDataForMode(SessionMode.SchemaEditor).setData(json);
      })
      .finally(() => (schemaFetched.value = true));
  }

  // DATA
  if ('data' in query) {
    dataFetched.value = false;
    const dataUrl = query.data as string;
    fetchExternalContent(dataUrl)
      .then(res => res.json())
      .then(json => {
        getDataForMode(SessionMode.DataEditor).setData(json);
      })
      .finally(() => (dataFetched.value = true));
  }

  // SNAPSHOT
  if ('snapshot' in query) {
    snapshotFetched.value = false;
    const snapshotId = query.snapshot as string;
    usesCustomSettings = true;
    skipSchemaDialog = true;
    restoreSnapshot(snapshotId).finally(() => (snapshotFetched.value = true));
  }

  // PROJECT
  if ('project' in query) {
    snapshotFetched.value = false;
    const projectId = query.project as string;
    usesCustomSettings = true;
    skipSchemaDialog = true;
    restoreSnapshot(projectId, true).finally(() => (snapshotFetched.value = true));
  }

  // Default settings fallback
  if (!usesCustomSettings) {
    settings.value.hideSettings = false;
    settings.value.hideSchemaEditor = false;
    settings.value.toolbarTitle = 'MetaConfigurator';
  }

  if (skipSchemaDialog) {
    sessionStore.hasShownInitialDialog = true;
  }

  // Wait for all fetches or 3s max
  const waitForAllOrTimeout = () =>
    new Promise(resolve => {
      const start = performance.now();

      const check = () => {
        if (
          settingsFetched.value &&
          schemaFetched.value &&
          dataFetched.value &&
          snapshotFetched.value
        ) {
          resolve(true);
        } else if (performance.now() - start > 3000) {
          console.warn('Timed out waiting for fetches, continuing.');
          resolve(false);
        } else {
          requestAnimationFrame(check);
        }
      };

      check();
    });

  waitForAllOrTimeout().then(() => {
    useAppRouter().push('/data');
  });
});
</script>

<template>
  <p>Fetching data from query:</p>
  <p>
    <i>{{ useAppRouter().currentRoute.value.query }}</i>
  </p>
</template>

<style scoped></style>
