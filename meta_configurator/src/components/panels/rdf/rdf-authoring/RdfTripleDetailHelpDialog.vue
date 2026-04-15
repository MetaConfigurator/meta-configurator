<template>
  <Dialog
    :visible="visible"
    header="Blank Node Handling"
    modal
    :style="{width: '50vw'}"
    @update:visible="emit('update:visible', $event)">
    <div class="flex flex-col gap-3 text-sm">
      <ul class="pl-4 list-disc leading-relaxed">
        <li>
          Choosing <code>Blank Node</code> for subject or object always creates a new internal blank
          node at root level on save.
        </li>
        <li>
          Existing blank nodes are not listed in subject/object dropdowns. Those lists contain only
          named node IRIs.
        </li>
        <li>Blank nodes do not support IRI-based rename.</li>
      </ul>
      <Divider align="left" type="dashed">
        <span class="font-semibold text-sm">Recommendation</span>
      </Divider>
      <p class="leading-relaxed">
        Use <code>Named Node</code> when you need a stable, reusable identifier across triples. Use
        <code>Blank Node</code> for local anonymous structures that do not need a fixed IRI.
      </p>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Divider from 'primevue/divider';

defineProps<{visible: boolean}>();
const emit = defineEmits<{(e: 'update:visible', value: boolean): void}>();
</script>
