<script setup lang="ts">
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import Divider from 'primevue/divider';
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import {jsonPointerToPathTyped, pathToJsonPointer} from "@/utility/pathUtils";
import {computed, type Ref, ref} from "vue";

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const currentPathInput: Ref<string> = ref('');
const currentSelectedElementInput: Ref<string> = ref('');
const dataInput: Ref<string> = ref('');
const schemaInput: Ref<string> = ref('');

const session = getSessionForMode(props.sessionMode);
const data = getDataForMode(props.sessionMode);
const schema = getSchemaForMode(props.sessionMode);

const formattedCurrentSelectedElement = computed(() => {
  return pathToJsonPointer(session.currentSelectedElement.value);
});
const formattedCurrentPath = computed(() => {
  return pathToJsonPointer(session.currentPath.value);
});

function submitCurrentPath(jsonPointer: string) {
  session.currentPath.value = jsonPointerToPathTyped(jsonPointer);
}

function submitCurrentSelectedElement(jsonPointer: string) {
  session.currentSelectedElement.value = jsonPointerToPathTyped(jsonPointer);
}

function submitData(dataText: string) {
  try {
    data.data.value = JSON.parse(dataText);
  } catch (e) {
    console.error('Invalid JSON data:', e);
  }
}

function submitSchema(schemaText: string) {
  try {
    schema.schemaRaw.value = JSON.parse(schemaText);
  } catch (e) {
    console.error('Invalid JSON schema:', e);
  }
}
</script>

<template>
  <div class="flex-grow overflow-y-auto" :data-testid="`test-component-${props.sessionMode}`">
    <div>
      <p data-testid="current-selected-element">
        {{formattedCurrentSelectedElement}}
      </p>
      <p data-testid="current-path">
        {{formattedCurrentPath}}
      </p>

      <p data-testid="data">
        {{JSON.stringify(data.data.value)}}
      </p>

      <p data-testid="schema">
        {{JSON.stringify(schema.schemaRaw.value)}}
      </p>

      <InputText
        v-model="currentPathInput"
        data-testid="current-path-input"
        placeholder="Current Path"
        />

      <Button
        data-testid="submit-current-path"
        :label="'Submit Current Path'"
        :icon="'pi pi-check'"
        class="p-button-success"
        @click="submitCurrentPath(currentPathInput)"
      />

      <InputText
        v-model="currentSelectedElementInput"
        data-testid="current-selected-element-input"
        placeholder="Current Selected Element"
        />

      <Button
        data-testid="submit-current-selected-element"
        :label="'Submit Current Selected Element'"
        :icon="'pi pi-check'"
        class="p-button-success"
        @click="submitCurrentSelectedElement(currentSelectedElementInput)"
      />

      <InputText
        v-model="dataInput"
        data-testid="data-input"
        placeholder="Data"
        />

      <Button
        data-testid="submit-data"
        :label="'Submit Data'"
        :icon="'pi pi-check'"
        class="p-button-success"
        @click="submitData(dataInput)"
      />

      <InputText
        v-model="schemaInput"
        data-testid="schema-input"
        placeholder="Schema"
        />

      <Button
        data-testid="submit-schema"
        :label="'Submit Schema'"
        :icon="'pi pi-check'"
        class="p-button-success"
        @click="submitSchema(schemaInput)"
      />


      <Divider />
    </div>
  </div>
</template>

<style scoped></style>
