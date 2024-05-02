<script setup lang="ts">
import {useAppRouter} from '@/router/router';
import {onMounted} from 'vue';
import {useDataSource} from '@/data/dataSource';
import {useSessionStore} from '@/store/sessionStore';

defineProps({
  settings_url: String,
});

onMounted(() => {
  const route = useAppRouter().currentRoute.value;
  const query = route.query;

  if ('settings' in query) {
    const settings_url = query.settings as string;
    console.debug('Received settings URL ', settings_url, ' from query.');
    fetch(settings_url)
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        console.debug('Fetched provided settings file and parsed as json.', jsonData);
        useDataSource().settingsData.value = jsonData;
      });
  }

  if ('schema' in query) {
    console.debug('skip initial schema selection dialog');
    useSessionStore().hasShownInitialDialog = true;

    const schema_url = query.schema as string;
    console.debug('Received schema URL ', schema_url, ' from query.');
    fetch(schema_url)
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        console.debug('Fetched provided schema file and parsed as json.', jsonData);
        useDataSource().userSchemaData.value = jsonData;
        // skip dialog if schema was already selected
      });
  }

  if ('data' in query) {
    const data_url = query.file as string;
    console.debug('Received data URL ', data_url, ' from query.');
    fetch(data_url)
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        console.debug('Fetched provided file and parsed as json.', jsonData);
        useDataSource().userData.value = jsonData;
      });
  }

  useAppRouter().push('/data');
});
</script>

<template>
  <label>Fetching data from query {{ useAppRouter().currentRoute.value.query }}</label>
</template>

<style scoped></style>
