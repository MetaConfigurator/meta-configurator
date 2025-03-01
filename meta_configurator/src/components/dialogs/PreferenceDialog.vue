<!-- Dialog to select the initial schema -->
<script setup lang="ts">
import {ref} from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import RadioButton from 'primevue/radiobutton';
import {useSettings} from '@/settings/useSettings';
import {useAppRouter} from '@/router/router';

const props = defineProps<{
  openSchemaSelectionFct: () => void;
}>();

const showDialog = ref(false);

const knowsJson = ref(true);
const isFocusSchemaEditing = ref(true);

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function isVisible() {
  return showDialog.value;
}

function updateSettings() {
  const settings = useSettings().value;
  settings.preferencesSelected = true;

  if (!knowsJson.value) {
    // hide the text editor panels
    settings.panels.dataEditor = settings.panels.dataEditor.filter(
      panel => panel.panelType !== 'textEditor'
    );
    settings.panels.schemaEditor = settings.panels.schemaEditor.filter(
      panel => panel.panelType !== 'textEditor'
    );
    settings.panels.settings = settings.panels.settings.filter(
      panel => panel.panelType !== 'textEditor'
    );

    // a user who does not know JSON will also not use advanced features from the GUI editor
    settings.panels.schemaEditor = settings.panels.schemaEditor.filter(
      panel => panel.panelType !== 'guiEditor'
    );
  }

  if (isFocusSchemaEditing.value) {
    const router = useAppRouter();
    router.push('/schema');
  } else {
    const router = useAppRouter();
    router.push('/data');
  }

  props.openSchemaSelectionFct();
}

defineExpose({show: openDialog, close: hideDialog, visible: isVisible});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Select your Preferences">
    <div class="dialog-content">
      <h2>Do you understand the file format <b>JSON</b>?</h2>

      <div class="flex flex-col gap-2">
        <RadioButtonGroup name="knowsJson" class="flex flex-wrap gap-4">
          <RadioButton v-model="knowsJson" name="knowsJson" :value="true" inputId="yes" />
          <label for="yes">Yes</label>
          <RadioButton v-model="knowsJson" name="knowsJson" :value="false" inputId="no" />
          <label for="no">No</label>
        </RadioButtonGroup>
      </div>

      <h2>What do you want to do?</h2>

      <div class="flex flex-col gap-2">
        <RadioButtonGroup name="isFocusSchemaEditing" class="flex flex-wrap gap-4">
          <RadioButton
            v-model="isFocusSchemaEditing"
            name="isFocusSchemaEditing"
            :value="true"
            inputId="yes" />
          <label for="yes"><b>Create</b>, <b>Modify</b> or <b>Explore</b> a <b>Schema</b></label>
          <RadioButton
            v-model="isFocusSchemaEditing"
            name="isFocusSchemaEditing"
            :value="false"
            inputId="no" />
          <label for="no"><b>Edit Data</b> based on a Schema</label>
        </RadioButtonGroup>
      </div>

      <Button
        type="submit"
        label="Submit"
        @click="
          () => {
            updateSettings();
            hideDialog();
          }
        " />
    </div>
  </Dialog>
</template>
<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}
</style>
