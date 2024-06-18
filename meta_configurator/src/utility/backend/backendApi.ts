import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {computed, type Ref} from 'vue';
import {useSettings} from '@/settings/useSettings';

const BASE_URL = computed(() => {
  return useSettings().backend.hostname + ':' + useSettings().backend.port;
});

export async function storeCurrentSession(resultRef: Ref<string>) {
  const data = getDataForMode(SessionMode.DataEditor).data.value;
  const schema = getDataForMode(SessionMode.SchemaEditor).data.value;
  const settings = getDataForMode(SessionMode.Settings).data.value;
  const result = await storeSession(data, schema, settings);
  resultRef.value = result['session_uuid'];
}

async function storeSession(data: any, schema: any, settings: any) {
  const response = await fetch(`${BASE_URL.value}/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({data: data, schema: schema, settings: settings}),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function getSession(sessionUuid: string) {
  const response = await fetch(`${BASE_URL}/session/${sessionUuid}`, {
    method: 'GET',
  });
  return response.json();
}

export async function restoreSession(sessionUuid: string) {
  const result = await getSession(sessionUuid);
  if ('error' in result) {
    throw new Error('Error for session with ID ' + sessionUuid + ': ' + result['error'] + '.');
  }
  if (!('data' in result) || !('schema' in result) || !('settings' in result)) {
    throw new Error('Invalid session data for UUID ' + sessionUuid + ' received from backend.');
  }
  const data = result['data'];
  const schema = result['schema'];
  const settings = result['settings'];
  getDataForMode(SessionMode.DataEditor).setData(data);
  getDataForMode(SessionMode.SchemaEditor).setData(schema);
  getDataForMode(SessionMode.Settings).setData(settings);
}
