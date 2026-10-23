<script setup lang="ts">
import Checkbox from 'primevue/checkbox';
import Panel from 'primevue/panel';

defineProps<{
  title: string;
  inputId: string;
}>();

/** Whether the refinement step is selected. */
const isEnabled = defineModel<boolean>('enabled', {required: true});
</script>

<template>
  <Panel class="refinement-panel">
    <template #header>
      <div class="refinement-title-row">
        <Checkbox v-model="isEnabled" binary :input-id="inputId" />
        <label class="refinement-title" :for="inputId">{{ title }}</label>
      </div>
    </template>

    <p class="refinement-description">
      <slot />
    </p>

    <div v-if="isEnabled && $slots.parameters" class="parameter-grid">
      <slot name="parameters" />
    </div>
  </Panel>
</template>

<style scoped>
.refinement-panel {
  overflow: hidden;
}

.refinement-panel :deep(.p-panel-header),
.refinement-panel :deep(.p-panel-content) {
  padding: 1rem;
}

.refinement-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.refinement-title {
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.refinement-description {
  margin: 0;
  color: var(--text-color-secondary);
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
</style>
