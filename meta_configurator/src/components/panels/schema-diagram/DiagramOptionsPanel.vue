<script setup lang="ts">
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import InputSwitch from 'primevue/inputswitch';
import {useSettings} from '@/settings/useSettings';
import Button from 'primevue/button';

const emit = defineEmits<{
  (e: 'rebuild_graph'): void;
  (e: 'fit_view'): void;
}>();

function rebuildGraph() {
  emit('rebuild_graph');
}

function fitView() {
  emit('fit_view');
}
</script>

<template>
  <Accordion :activeIndex="1" class="options-element">
    <AccordionTab header="Schema Diagram Options">
      <div>
        <label
          >Graph direction vertical
          <InputSwitch
            v-model="useSettings().schemaDiagram.vertical"
            class="options-input-switch" />
        </label>
      </div>
      <div>
        <label
          >Show attributes
          <InputSwitch
            v-model="useSettings().schemaDiagram.showAttributes"
            label="Automatic zoom"
            class="options-input-switch" />
        </label>
      </div>
      <div>
        <label
          >Show enum values
          <InputSwitch
            v-model="useSettings().schemaDiagram.showEnumValues"
            class="options-input-switch" />
        </label>
      </div>
      <div>
        <label
          >Move view on element selection
          <InputSwitch
            v-model="useSettings().schemaDiagram.moveViewToSelectedElement"
            class="options-input-switch" />
        </label>
      </div>
      <div>
        <label
          >Merge allOfs
          <InputSwitch
            v-model="useSettings().schemaDiagram.mergeAllOfs"
            class="options-input-switch" />
        </label>
      </div>

      <div class="container">
        <div>
          <Button label="Rebuild Graph" @click="rebuildGraph" class="options-element" />
        </div>
        <div>
          <Button label="Fit View" @click="fitView" class="options-element" />
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
