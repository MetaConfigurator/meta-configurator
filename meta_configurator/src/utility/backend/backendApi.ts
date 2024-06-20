import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {computed, type Ref} from 'vue';
import {useSettings} from '@/settings/useSettings';
import {errorService} from '@/main';

const BACKEND_URL = computed(() => {
  return useSettings().backend.hostname + ':' + useSettings().backend.port;
});

const FRONTEND_URL = computed(() => {
  return useSettings().frontend.hostname;
});

export async function storeCurrentSnapshot(resultRef: Ref<string>, errorRef: Ref<string>) {
  const data = getDataForMode(SessionMode.DataEditor).data.value;
  const schema = getDataForMode(SessionMode.SchemaEditor).data.value;
  const settings = getDataForMode(SessionMode.Settings).data.value;
  const result = await storeSnapshot(data, schema, settings, errorRef);
  const snapshotId = result['snapshot_id'];
  resultRef.value = `${FRONTEND_URL.value}/?snapshot=${snapshotId}`;
}

async function storeSnapshot(data: any, schema: any, settings: any, errorRef: Ref<string>) {
  const body: any = {
    data: data,
    schema: schema,
    settings: settings,
  };

  const response = await fetch(`${BACKEND_URL.value}/snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    const errorMessage = 'Rate limit exceeded. Please try again later.';
    errorRef.value = errorMessage;
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    const errorMessage = `HTTP error! status: ${response.status}`;
    errorRef.value = errorMessage;
    throw new Error(errorMessage);
  }

  errorRef.value = '';

  return response.json();
}

async function getSnapshot(snapshotId: string) {
  const response = await fetch(`${BACKEND_URL.value}/snapshot/${snapshotId}`, {
    method: 'GET',
  });

  if (response.status === 429) {
    const errorMessage = 'Rate limit exceeded. Please try again later.';
    errorService.onError(errorMessage);
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const errorMessage = 'Invalid content type received from backend.';
    errorService.onError(errorMessage);
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function restoreSnapshot(snapshotId: string) {
  const result = await getSnapshot(snapshotId);
  if ('error' in result) {
    const errorMessage = 'Error while fetching snapshot data for ID ' + snapshotId + ' from backend: ' + result['error'];
    errorService.onError(errorMessage);
    throw new Error(errorMessage);
  }
  if (!('data' in result) || !('schema' in result) || !('settings' in result)) {
    const errorMessage = 'Invalid snapshot data received from backend.';
    errorService.onError(errorMessage);
    throw new Error(errorMessage);
  }
  const data = result['data'];
  const schema = result['schema'];
  const settings = result['settings'];
  getDataForMode(SessionMode.DataEditor).setData(data);
  getDataForMode(SessionMode.SchemaEditor).setData(schema);
  getDataForMode(SessionMode.Settings).setData(settings);
}
