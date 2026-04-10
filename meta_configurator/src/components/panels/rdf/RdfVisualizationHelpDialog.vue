<template>
  <Dialog
    :visible="visible"
    header="Visualization Mode - Query Requirements"
    modal
    style="width: 500px"
    @update:visible="emit('update:visible', $event)">
    <div class="text-sm leading-relaxed">
      <p class="mb-3">
        <b>Visualization mode</b> works by directly consuming RDF triples. For this reason, only
        <b>SPARQL CONSTRUCT queries</b> are supported.
      </p>
      <p class="font-semibold mb-1">Required query structure:</p>
      <ul class="pl-4 list-disc mb-3">
        <li>The query <b>must be a CONSTRUCT query</b></li>
        <li>
          The <code>CONSTRUCT</code> template must follow this exact pattern:
          <pre
            :class="[
              'p-2 rounded text-xs overflow-auto !bg-gray-100',
              isDark.valueOf() && '!bg-gray-900',
            ]"
            >{{ visualizationQueryExample_1 }}
  </pre
          >
        </li>
        <li>The <code>WHERE</code> clause may contain any valid SPARQL pattern</li>
        <li>
          <code>?subject</code> and <code>?predicate</code> must always be a
          <b>Named Node (IRI)</b>
        </li>
        <li><code>?object</code> may be IRI or literal</li>
      </ul>

      <p class="font-semibold mb-1">Example:</p>
      <pre
        :class="[
          'p-2 rounded text-xs overflow-auto !bg-gray-100',
          isDark.valueOf() && '!bg-gray-900',
        ]"
        >{{ visualizationQueryExample_2 }}
  </pre
      >
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import {isDark} from '@/components/panels/rdf/rdfUtils';
import {
  visualizationQueryExample_1,
  visualizationQueryExample_2,
} from '@/components/panels/rdf/rdfUtils';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();
</script>
