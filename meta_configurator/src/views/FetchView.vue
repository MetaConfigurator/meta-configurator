<script setup lang="ts">
import {useAppRouter} from '@/router/router';
import {onMounted} from 'vue';
import {useDataSource} from '@/data/dataSource';
import {useSessionStore} from '@/store/sessionStore';
import {restoreSnapshot} from '@/utility/backend/backendApi';

defineProps({
  settings_url: String,
});


function processUrl(url: string) : string {
  // if url is Github URL, convert to raw source code URL
  if (url.includes('github.com')) {
    const parts = url.split('/');
    if (parts.length < 8) {
      console.error('Invalid Github URL: ', url);
      return url;
    }
    const user = parts[3];
    const repo = parts[4];
    const branch = parts[6];
    const path = parts.slice(7).join('/');
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
  }

  return url;
}

onMounted(() => {
  const route = useAppRouter().currentRoute.value;
  const query = route.query;

  if ('settings' in query) {
    const settingsUrl = processUrl(query.settings as string);
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

    const schemaUrl = processUrl(query.schema as string);
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
    const dataUrl = processUrl(query.data as string);
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
    console.debug('skip initial schema selection dialog');
    useSessionStore().hasShownInitialDialog = true;

    const snapshotId = query.snapshot as string;
    console.info('Received snapshot ID ', snapshotId, ' from query string "', query, '".');
    restoreSnapshot(snapshotId);
  }
  if ('project' in query) {
    console.debug('skip initial schema selection dialog');
    useSessionStore().hasShownInitialDialog = true;

    const projectId = query.project as string;
    console.info('Received project ID ', projectId, ' from query string "', query, '".');
    restoreSnapshot(projectId, true);
  }

  useAppRouter().push('/data');
});
</script>

<template>
  <label>Fetching data from query {{ useAppRouter().currentRoute.value.query }}</label>
</template>

<style scoped></style>
