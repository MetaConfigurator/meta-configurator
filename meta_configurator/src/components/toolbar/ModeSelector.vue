<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import type {MenuItem} from 'primevue/menuitem';
import TabMenu from 'primevue/tabmenu';
import {modeToMenuTitle, SessionMode} from '@/store/sessionMode';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
}>();

const settings = useSettings();

function getTabs(settings): MenuItem[] {
  const items: MenuItem[] = [];

  items.push({
    label: modeToMenuTitle(SessionMode.DataEditor),
    icon: 'fa-regular fa-file',
    index: 0,
    command: () => emit('mode-selected', SessionMode.DataEditor),
  });

  if (!settings.hideSchemaEditor) {
    items.push({
      label: modeToMenuTitle(SessionMode.SchemaEditor),
      icon: 'fa-regular fa-file-code',
      index: 1,
      command: () => emit('mode-selected', SessionMode.SchemaEditor),
    });
  }

  if (!settings.hideSettings) {
    items.push({
      label: modeToMenuTitle(SessionMode.Settings),
      icon: 'fa-solid fa-cog',
      index: 2,
      hidden: true, // hide by default from the mode selector, because it is accessible via the settings button at another place
      command: () => emit('mode-selected', SessionMode.Settings),
    });
  }

  return items;
}

const tabs = computed(() => getTabs(settings.value));

const activeIndex = ref(0);

// sync initial index
watch(
  () => props.currentMode,
  mode => {
    const idx = tabs.value.findIndex(
      (t, i) => t.command && tabs.value[i].label === modeToMenuTitle(mode)
    );
    if (idx >= 0) activeIndex.value = idx;
  },
  {immediate: true}
);

function onTabChange(event) {
  const idx = event.index;
  const item = tabs.value[idx];
  if (item?.command) {
    item.command(event);
  }
}
</script>

<template>
  <TabMenu
    v-model:activeIndex="activeIndex"
    :model="tabs"
    @tab-change="onTabChange"
    class="page-tabmenu">
    <template #item="{item, props}">
      <a
        v-show="(item.hidden ?? false) !== true"
        v-bind="props.action"
        class="page-tab"
        :data-testid="'mode-active-' + (item.index === activeIndex ? 'true' : 'false')">
        <span class="font-bold">{{ item.label }}</span>
      </a>
    </template>
  </TabMenu>
</template>

<style scoped>
.page-tabmenu .p-tabmenu {
  font-weight: bold;
  font-size: 0.1rem;
}
.page-tabmenu .p-tabmenuitem-link {
  display: flex;
  align-items: center;
}

.page-tab {
  padding: 0.4rem 1rem;
}
</style>
