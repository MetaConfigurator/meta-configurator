<script setup lang="ts">
import {useAppRouter} from '@/router/router';
import {onMounted} from 'vue';
import {useSessionStore} from '@/store/sessionStore';
import {restoreSnapshot} from '@/utility/backend/backendApi';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {useSettings} from '@/settings/useSettings';
import {fetchExternalContent} from '@/utility/fetchExternalContent';
import {updateSettingsWithDefaults, overwriteSettings} from '@/settings/settingsUpdater';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';

defineProps({
  settings_url: String,
});

const sessionStore = useSessionStore();
const settings = useSettings();

onMounted(() => {
  // update user settings by adding default value for missing fields
  // also performs settings migration in case of outdated settings
  // this is needed here, because, for example, loading snapshots involves reading the backend address from the settings
  const userSettings = getDataForMode(SessionMode.Settings).data.value;
  const defaultSettings: any = structuredClone(SETTINGS_DATA_DEFAULT);
  updateSettingsWithDefaults(userSettings, defaultSettings);

  const route = useAppRouter().currentRoute.value;
  const query = route.query;
  let usesCustomSettings = false;
  let skipSchemaDialog = false;

  if ('settings' in query) {
    const settingsUrl = query.settings as string;
    console.info('Received settings URL ', settingsUrl, ' from query string "', query, '".');
    usesCustomSettings = true;
    fetchExternalContent(settingsUrl)
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        console.info('Fetched provided settings file and parsed as json.', jsonData);
        const userSettings = getDataForMode(SessionMode.Settings).data.value;
        overwriteSettings(userSettings, jsonData);
      });
  }

  if ('schema' in query) {
    skipSchemaDialog = true;

    const schemaUrl = query.schema as string;
    console.info('Received schema URL ', schemaUrl, ' from query string "', query, '".');
    fetchExternalContent(schemaUrl)
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        console.info('Fetched provided schema file and parsed as json.', jsonData);
        getDataForMode(SessionMode.SchemaEditor).setData(jsonData);
      });
  }

  if ('data' in query) {
    const dataUrl = query.data as string;
    console.info('Received data URL ', dataUrl, ' from query string "', query, '".');
    fetchExternalContent(dataUrl)
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        console.info('Fetched provided file and parsed as json.', jsonData);
        getDataForMode(SessionMode.DataEditor).setData(jsonData);
      });
  }

  if ('snapshot' in query) {
    skipSchemaDialog = true;

    const snapshotId = query.snapshot as string;
    console.info('Received snapshot ID ', snapshotId, ' from query string "', query, '".');
    usesCustomSettings = true;
    restoreSnapshot(snapshotId);
  }
  if ('project' in query) {
    skipSchemaDialog = true;

    const projectId = query.project as string;
    console.info('Received project ID ', projectId, ' from query string "', query, '".');
    usesCustomSettings = true;
    restoreSnapshot(projectId, true);
  }

  if (!usesCustomSettings) {
    settings.value.hideSettings = false;
    settings.value.hideSchemaEditor = false;
    settings.value.toolbarTitle = 'MetaConfigurator';
  }
  if (skipSchemaDialog) {
    sessionStore.hasShownInitialDialog = true;
  }

  useAppRouter().push('/data');
});
</script>

<template>
  <label>Fetching data from query {{ useAppRouter().currentRoute.value.query }}</label>
</template>

<style scoped></style>
