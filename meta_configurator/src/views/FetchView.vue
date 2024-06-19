<script setup lang="ts">
import {useAppRouter} from '@/router/router';
import {onMounted} from 'vue';
import {useDataSource} from '@/data/dataSource';
import {useSessionStore} from '@/store/sessionStore';
import {restoreSnapshot} from '@/utility/backend/backendApi';

defineProps({
  settings_url: String,
});

onMounted(() => {
  const route = useAppRouter().currentRoute.value;
  const query = route.query;

  if ('settings' in query) {
    const settingsUrl = query.settings as string;
    console.info('Received settings URL ', settingsUrl, ' from query string "', query, '".');
    fetch(settingsUrl)
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        console.info('Fetched provided settings file and parsed as json.', jsonData);
        useDataSource().settingsData.value = jsonData;
      });
  }

  if ('schema' in query) {
    console.debug('skip initial schema selection dialog');
    useSessionStore().hasShownInitialDialog = true;

    const schemaUrl = query.schema as string;
    console.info('Received schema URL ', schemaUrl, ' from query string "', query, '".');
    fetch(schemaUrl)
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        console.info('Fetched provided schema file and parsed as json.', jsonData);
        useDataSource().userSchemaData.value = jsonData;
        // skip dialog if schema was already selected
      });
  }

  if ('data' in query) {
    const dataUrl = query.data as string;
    console.info('Received data URL ', dataUrl, ' from query string "', query, '".');
    fetch(dataUrl)
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        console.info('Fetched provided file and parsed as json.', jsonData);
        useDataSource().userData.value = jsonData;
      });
  }

  if ('snapshot' in query) {
    const snapshotId = query.session as string;
    console.info('Received snapshot ID ', snapshotId, ' from query string "', query, '".');
    restoreSnapshot(snapshotId);
  }

  useAppRouter().push('/data');
});
</script>

<template>
  <label>Fetching data from query {{ useAppRouter().currentRoute.value.query }}</label>
</template>

<style scoped></style>
