<template>
  <Dialog
    :visible="visible"
    header="Visualization Mode - Query Requirements"
    modal
    style="width: 500px"
    @update:visible="emit('update:visible', $event)">
    <div class="flex flex-col gap-3 text-sm">
      <ul class="pl-4 list-disc leading-relaxed">
        <li>The query <b>must be a CONSTRUCT query</b></li>
        <li>
          The <code>CONSTRUCT</code> template must follow this exact pattern:
          <Card class="mt-2 code-card">
            <template #content>
              <pre class="code-block">{{ visualizationQueryExample_1 }}</pre>
            </template>
          </Card>
        </li>
        <li>The <code>WHERE</code> clause may contain any valid SPARQL pattern</li>
        <li>
          <code>?subject</code> and <code>?predicate</code> must always be a
          <b>Named Node (IRI)</b>
        </li>
        <li><code>?object</code> may be IRI or literal</li>
      </ul>
      <Divider align="left" type="dashed">
        <span class="font-semibold text-sm">Example</span>
      </Divider>
      <Card class="code-card">
        <template #content>
          <pre class="code-block">{{ visualizationQueryExample_2 }}</pre>
        </template>
      </Card>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import {
  visualizationQueryExample_1,
  visualizationQueryExample_2,
} from '@/components/panels/rdf/rdfUtils';

defineProps<{visible: boolean}>();
const emit = defineEmits<{(e: 'update:visible', value: boolean): void}>();
</script>

<style scoped>
.code-block {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-x: auto;
  margin: 0;
}

.code-card :deep(.p-card-body),
.code-card :deep(.p-card) {
  border: 1px solid var(--p-surface-300);
  border-radius: var(--p-border-radius);
}
</style>
