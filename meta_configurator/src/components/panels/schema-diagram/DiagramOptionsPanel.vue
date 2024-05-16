<script setup lang="ts">
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import InputSwitch from 'primevue/inputswitch';
import {useSettings} from '@/settings/useSettings';
import Splitter from 'primevue/splitter';
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

<!-- TODO: Make it look better! -->
<template>
  <Accordion :activeIndex="1">
    <AccordionTab header="Schema Diagram Options">
      <div>
        <label
          >Graph direction vertical
          <InputSwitch v-model="useSettings().schemaDiagram.vertical" label="Vertical" />
        </label>
      </div>
      <div>
        <label
          >Show attributes
          <InputSwitch
            v-model="useSettings().schemaDiagram.showAttributes"
            label="Automatic zoom" />
        </label>
      </div>
      <div>
        <label
          >Show enum values
          <InputSwitch v-model="useSettings().schemaDiagram.showEnumValues" />
        </label>
      </div>
      <div>
        <label
          >Move view on element selection
          <InputSwitch v-model="useSettings().schemaDiagram.moveViewToSelectedElement" />
        </label>
      </div>
      <div>
        <label
          >Merge allOfs
          <InputSwitch v-model="useSettings().schemaDiagram.mergeAllOfs" />
        </label>
      </div>

      <Splitter />

      <div class="container">
        <div>
          <Button label="Rebuild Graph" @click="rebuildGraph" class="" />
        </div>
        <div>
          <Button label="Fit View" @click="fitView" class="" />
        </div>
      </div>
    </AccordionTab>
  </Accordion>
</template>

<style scoped>
.container {
  display: flex;
}
</style>
