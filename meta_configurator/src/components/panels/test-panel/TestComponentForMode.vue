<script setup lang="ts">
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import Divider from 'primevue/divider';
import InputText from "primevue/inputtext";
import {pathToString} from "../../../utility/pathUtils";

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const session = getSessionForMode(props.sessionMode);
const data = getDataForMode(props.sessionMode);
const schema = getSchemaForMode(props.sessionMode);
</script>

<template>
  <div class="flex-grow overflow-y-auto" :data-testid="`test_component-${props.sessionMode}`">
    <div>
      <p data-testid="currentSelectedElement">
        {{pathToString(session.currentSelectedElement.value)}}
      </p>
      <p data-testid="currentPath">
        {{pathToString(session.currentPath.value)}}
      </p>

      <p data-testid="data">
        {{JSON.stringify(data.data.value)}}
      </p>

      <p data-testid="schema">
        {{JSON.stringify(schema.schemaRaw.value)}}
      </p>

      <InputText
        :v-model="session.currentPath"
        data-testid="currentPathInput"
        placeholder="Current Path"
        />

      <InputText
        :v-model="session.currentSelectedElement"
        data-testid="currentSelectedElementInput"
        placeholder="Current Selected Element"
        />


      <Divider />
    </div>
  </div>
</template>

<style scoped></style>
