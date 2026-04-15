<template>
  <div class="graph-panel">
    <div class="graph-wrapper" :class="{'graph-frozen': hasGraphError}">
      <div
        ref="graphContainer"
        class="graph-container"
        :class="{'graph-loaded': graphLoaded}"></div>
      <Dock :model="dockItems" position="right" class="graph-dock">
        <template #itemicon="{item}">
          <Button
            :icon="item.icon"
            rounded
            raised
            :disabled="hasGraphError"
            v-tooltip.left="item.label"
            @click="item.command" />
        </template>
      </Dock>
      <Dock v-if="!readOnly" :model="bottomDockItems" position="bottom" class="graph-dock-bottom">
        <template #itemicon="{item}">
          <Button
            :icon="item.icon"
            rounded
            raised
            v-tooltip.top="item.label"
            @click="item.command" />
        </template>
      </Dock>
      <Transition name="fade">
        <ProgressSpinner v-if="isLoading" class="loading-overlay" />
      </Transition>
      <div v-if="hasGraphError" class="graph-freeze-overlay">
        <Message severity="error" :closable="false" class="solid-message">
          Graph is disabled because the data contains errors.
        </Message>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import Button from 'primevue/button';
import Dock from 'primevue/dock';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';

defineProps<{
  readOnly: boolean;
  hasGraphError: boolean;
  graphLoaded: boolean;
  isLoading: boolean;
  dockItems: any[];
  bottomDockItems: any[];
}>();

const emit = defineEmits<{
  (e: 'container-change', element: HTMLDivElement | null): void;
}>();

const graphContainer = ref<HTMLDivElement | null>(null);

watch(
  graphContainer,
  value => {
    emit('container-change', value);
  },
  {immediate: true}
);

onMounted(() => {
  emit('container-change', graphContainer.value);
});
</script>

<style scoped>
.graph-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-width: 0;
}

.graph-wrapper {
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
}

.graph-frozen .graph-container,
.graph-frozen .graph-dock {
  pointer-events: none;
  opacity: 0.6;
  filter: grayscale(0.2);
}

.graph-freeze-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.graph-container {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
}

.graph-container.graph-loaded {
  opacity: 1;
}

.graph-dock :deep(.p-dock-list-container) {
  background: transparent !important;
  border: none !important ;
}

.graph-dock {
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  z-index: 60;
}

.graph-dock-bottom {
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 60;
}

.graph-dock-bottom :deep(.p-dock-list-container) {
  background: transparent !important;
  border: none !important ;
}

.graph-dock :deep(.p-dock) {
  background: transparent;
}

.graph-dock :deep(.p-dock-list) {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
}

.graph-dock-bottom :deep(.p-dock) {
  background: transparent;
}

.graph-dock-bottom :deep(.p-dock-list) {
  display: flex;
  flex-direction: row;
  gap: 10px;
  padding: 0;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
}

.solid-message {
  background-color: var(--p-red-100) !important;
  opacity: 1;
}
</style>
