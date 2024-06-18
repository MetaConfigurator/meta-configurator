import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {computed, type Ref} from 'vue';
import {useSettings} from '@/settings/useSettings';

const BACKEND_URL = computed(() => {
  return useSettings().backend.hostname + ':' + useSettings().backend.port;
});

const FRONTEND_URL = computed(() => {
    return useSettings().frontend.hostname;
});

export async function storeCurrentSession(resultRef: Ref<string>) {
  const data = getDataForMode(SessionMode.DataEditor).data.value;
  const schema = getDataForMode(SessionMode.SchemaEditor).data.value;
  const settings = getDataForMode(SessionMode.Settings).data.value;
  const result = await storeSession(data, schema, settings);
  const sessionId = result['session_id'];
  resultRef.value = `${FRONTEND_URL.value}/?session=${sessionId}`;
}

async function storeSession(data: any, schema: any, settings: any) {
  const response = await fetch(`${BACKEND_URL.value}/session`, {
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

async function getSession(sessionId: string) {
  const response = await fetch(`${BACKEND_URL.value}/session/${sessionId}`, {
    method: 'GET',
  });


  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const errorText = await response.text();
    throw new Error(`Unexpected response from server: ${errorText}`);
  }

  return response.json();
}

export async function restoreSession(sessionId: string) {
  const result = await getSession(sessionId);
  if ('error' in result) {
    throw new Error('Error for session with ID ' + sessionId + ': ' + result['error'] + '.');
  }
  if (!('data' in result) || !('schema' in result) || !('settings' in result)) {
    throw new Error('Invalid session data for ID ' + sessionId + ' received from backend.');
  }
  const data = result['data'];
  const schema = result['schema'];
  const settings = result['settings'];
  getDataForMode(SessionMode.DataEditor).setData(data);
  getDataForMode(SessionMode.SchemaEditor).setData(schema);
  getDataForMode(SessionMode.Settings).setData(settings);
}
