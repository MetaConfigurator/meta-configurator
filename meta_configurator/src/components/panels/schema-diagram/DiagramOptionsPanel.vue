<script setup lang="ts">
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import ToggleSwitch from 'primevue/toggleswitch';
import {useSettings} from '@/settings/useSettings';
import Button from 'primevue/button';
const emit = defineEmits<{
  (e: 'rebuild_graph'): void;
  (e: 'fit_view'): void;
}>();

function rebuildGraph() {
  emit('rebuild_graph');
  emit('fit_view');
}


const settings = useSettings();
</script>

<template>
  <Accordion :activeIndex="1" class="options-element">
    <AccordionTab header="Schema Diagram Options">
      <div>
        <label
          >Edit Mode
          <ToggleSwitch v-model="settings.schemaDiagram.editMode" class="options-input-switch" />
        </label>
      </div>
      <div>
        <label
          >Graph direction vertical
          <ToggleSwitch v-model="settings.schemaDiagram.vertical" class="options-input-switch" />
        </label>
      </div>
      <div>
        <label
          >Show attributes
          <ToggleSwitch
            v-model="settings.schemaDiagram.showAttributes"
            label="Automatic zoom"
            class="options-input-switch" />
        </label>
      </div>
      <div>
        <label
          >Show enum values
          <ToggleSwitch
            v-model="settings.schemaDiagram.showEnumValues"
            class="options-input-switch" />
        </label>
      </div>
      <div>
        <label
          >Move view on element selection
          <ToggleSwitch
            v-model="settings.schemaDiagram.moveViewToSelectedElement"
            class="options-input-switch" />
        </label>
      </div>
      <div class="container">
        <div>
          <Button label="Rebuild Graph" @click="rebuildGraph" class="options-element" />
        </div>
      </div>
    </AccordionTab>
  </Accordion>
</template>

<style scoped>
.container {
  display: flex;
  justify-content: space-between;
}
.options-element {
  font-size: 11px;
  position: relative;
  border: 4px;
  padding: 6px;
}

.options-input-switch {
  height: 15px;
}
</style>
