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

export async function storeCurrentSnapshot(resultRef: Ref<string>, editPassword: string, author: string | null = null) {
  const data = getDataForMode(SessionMode.DataEditor).data.value;
  const schema = getDataForMode(SessionMode.SchemaEditor).data.value;
  const settings = getDataForMode(SessionMode.Settings).data.value;
  const result = await storeSnapshot(data, schema, settings, author);
  const snapshotId = result['snapshot_id'];
  resultRef.value = `${FRONTEND_URL.value}/?snapshot=${snapshotId}`;
}

async function storeSnapshot(data: any, schema: any, settings: any, author: string | null = null) {
  const body: any = {
    data: data,
    schema: schema,
    settings: settings,
    author: author || 'anonymous',
  };

  if (author) {
    body['author'] = author;
  }

  const response = await fetch(`${BACKEND_URL.value}/snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function getSnapshot(snapshotId: string) {
  const response = await fetch(`${BACKEND_URL.value}/snapshot/${snapshotId}`, {
    method: 'GET',
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const errorText = await response.text();
    throw new Error(`Unexpected response from server: ${errorText}`);
  }

  return response.json();
}

export async function restoreSnapshot(snapshotId: string) {
  const result = await getSnapshot(snapshotId);
  if ('error' in result) {
    throw new Error('Error for snapshot with ID ' + snapshotId + ': ' + result['error'] + '.');
  }
  if (!('data' in result) || !('schema' in result) || !('settings' in result)) {
    throw new Error('Invalid snapshot data for ID ' + snapshotId + ' received from backend.');
  }
  const data = result['data'];
  const schema = result['schema'];
  const settings = result['settings'];
  getDataForMode(SessionMode.DataEditor).setData(data);
  getDataForMode(SessionMode.SchemaEditor).setData(schema);
  getDataForMode(SessionMode.Settings).setData(settings);
}
