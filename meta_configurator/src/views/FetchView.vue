<script setup lang="ts">
import {useAppRouter} from '@/router/router';
import {onMounted} from 'vue';
import {useSessionStore} from '@/store/sessionStore';
import {restoreSnapshot} from '@/utility/backend/backendApi';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {useSettings} from '@/settings/useSettings';
import {fetchExternalContent} from '@/utility/fetchExternalContent';
import {overwriteSettings} from '@/utility/settingsUpdater';

defineProps({
  settings_url: String,
});

const sessionStore = useSessionStore();
const settings = useSettings();

onMounted(() => {
  const route = useAppRouter().currentRoute.value;
  const query = route.query;
  let usesCustomSettings = false;

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
        overwriteSettings(jsonData);
      });
  }

  if ('schema' in query) {
    console.debug('skip initial schema selection dialog');
    sessionStore.hasShownInitialDialog = true;

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
    console.debug('skip initial schema selection dialog');
    sessionStore.hasShownInitialDialog = true;

    const snapshotId = query.snapshot as string;
    console.info('Received snapshot ID ', snapshotId, ' from query string "', query, '".');
    usesCustomSettings = true;
    restoreSnapshot(snapshotId);
  }
  if ('project' in query) {
    console.debug('skip initial schema selection dialog');
    useSessionStore().hasShownInitialDialog = true;

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

  useAppRouter().push('/data');
});
</script>

<template>
  <label>Fetching data from query {{ useAppRouter().currentRoute.value.query }}</label>
</template>

<style scoped></style>
