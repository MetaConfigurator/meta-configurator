import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {computed, type Ref} from 'vue';
import {useSettings} from '@/settings/useSettings';
import {stringToIdentifier} from '@/utility/stringToIdentifier';
import {useErrorService} from '@/utility/errorServiceInstance';

const settings = useSettings();

const BACKEND_URL = computed(() => {
  return settings.value.backend.hostname;
});

const FRONTEND_URL = computed(() => {
  return settings.value.frontend.hostname;
});

export async function publishProjectLink(
  projectId: string,
  editPassword: string,
  snapshotId: string,
  resultProjectLink: Ref<String>,
  infoRef: Ref<string>,
  errorRef: Ref<string>
) {
  infoRef.value = 'Publishing project...';

  const normalizedProjectId = stringToIdentifier(projectId);

  const response = await fetch(`${BACKEND_URL.value}/project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project_id: normalizedProjectId,
      snapshot_id: snapshotId,
      edit_password: editPassword,
    }),
  });

  handleErrors(response, errorRef);

  errorRef.value = '';
  infoRef.value = '';
  resultProjectLink.value = `${FRONTEND_URL.value}/?project=${normalizedProjectId}`;

  return response.json();
}

export async function storeCurrentSnapshot(
  resultSnapshotLink: Ref<string>,
  infoRef: Ref<string>,
  errorRef: Ref<string>
) {
  const data = getDataForMode(SessionMode.DataEditor).data.value;
  const schema = getDataForMode(SessionMode.SchemaEditor).data.value;
  const settings = getDataForMode(SessionMode.Settings).data.value;
  const result = await storeSnapshot(data, schema, settings, infoRef, errorRef);
  const snapshotId = result['snapshot_id'];
  resultSnapshotLink.value = `${FRONTEND_URL.value}/?snapshot=${snapshotId}`;
  return snapshotId;
}

async function storeSnapshot(
  data: any,
  schema: any,
  settings: any,
  infoRef: Ref<string>,
  errorRef: Ref<string>
) {
  const body: any = {
    data: data,
    schema: schema,
    settings: settings,
  };

  infoRef.value = 'Storing snapshot...';

  const response = await fetch(`${BACKEND_URL.value}/snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  await handleErrors(response, errorRef);

  infoRef.value = '';
  errorRef.value = '';

  return response.json();
}

async function getSnapshot(snapshotId: string, isProject: boolean = false) {
  const path = isProject ? 'project' : 'snapshot';
  const response = await fetch(`${BACKEND_URL.value}/${path}/${snapshotId}`, {
    method: 'GET',
  });
  await handleErrors(response, null);

  return response.json();
}

export async function restoreSnapshot(snapshotId: string, isProject: boolean = false) {
  const result = await getSnapshot(snapshotId, isProject);
  if ('error' in result) {
    const errorMessage =
      'Error while fetching snapshot data for ID ' +
      snapshotId +
      ' from backend: ' +
      result['error'];
    useErrorService().onError(errorMessage);
    throw new Error(errorMessage);
  }
  if (!('data' in result) || !('schema' in result) || !('settings' in result)) {
    const errorMessage = 'Invalid snapshot data received from backend.';
    useErrorService().onError(errorMessage);
    throw new Error(errorMessage);
  }
  const data = result['data'];
  const schema = result['schema'];
  const settings = result['settings'];
  getDataForMode(SessionMode.DataEditor).setData(data);
  getDataForMode(SessionMode.SchemaEditor).setData(schema);
  getDataForMode(SessionMode.Settings).setData(settings);
}

async function handleErrors(response: Response, errorRef: Ref<string> | null) {
  if (response.status === 429) {
    throwError('Rate limit exceeded. Please try again later.', errorRef);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throwError('Invalid content type received from backend.', errorRef);
  }
  if (!response.ok) {
    const json = await response.json();
    if (json['error']) {
      throwError(json['error'], errorRef);
    }
  }
}

function throwError(errorMessage: string, errorRef: Ref<string> | null) {
  if (errorRef) {
    errorRef.value = errorMessage;
  } else {
    useErrorService().onError(errorMessage);
  }
  throw new Error(errorMessage);
}
