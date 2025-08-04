import {ref, type Ref, watch} from 'vue';

const initialized: Ref<boolean> = ref(false);
const apiKey: Ref<string> = ref('');
const isPersistKey: Ref<boolean> = ref(true);

export function iniApiKey() {
  if (initialized.value) {
    return;
  }
  const storedApiKey = localStorage.getItem('openai_api_key');
  if (storedApiKey) {
    apiKey.value = storedApiKey;
  }
  const storedPersistKey = localStorage.getItem('openai_persist_key');
  if (storedPersistKey) {
    isPersistKey.value = storedPersistKey === 'true';
  }
  initialized.value = true;
}

export function getApiKeyRef(): Ref<string> {
  if (!initialized.value) {
    iniApiKey();
  }
  return apiKey;
}

export function getIsPersistKeyRef(): Ref<boolean> {
  if (!initialized.value) {
    iniApiKey();
  }
  return isPersistKey;
}

watch(apiKey, newValue => {
  if (isPersistKey.value) {
    localStorage.setItem('openai_api_key', newValue);
  }
});

watch(isPersistKey, newValue => {
  localStorage.setItem('openai_persist_key', newValue.toString());
  if (!newValue) {
    localStorage.removeItem('openai_api_key');
  }
});
