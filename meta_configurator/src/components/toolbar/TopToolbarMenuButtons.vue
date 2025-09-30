<script setup lang="ts">
import {computed, ref} from 'vue';
import type {MenuItem} from 'primevue/menuitem';
import Menu from 'primevue/menu';
import {MenuItems} from '@/components/toolbar/menuItems';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';

import {SessionMode} from '@/store/sessionMode';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {useSettings} from '@/settings/useSettings';
import {inferJsonSchema} from '@/schema/inferJsonSchema';

const props = defineProps<{
  currentMode: SessionMode;
  showBottomMenu: boolean;
}>();

const emit = defineEmits<{
  (e: 'show-url-dialog'): void;
  (e: 'show-example-schemas-dialog'): void;
  (e: 'show-schemastore-dialog'): void;
  (e: 'show-import-csv-dialog'): void;
  (e: 'show-snapshot-dialog'): void;
  (e: 'show-codegen-dialog', schemaMode: boolean): void;
  (e: 'show-data-export-dialog', schemaMode: boolean): void;
  (e: 'show-data-mapping-dialog'): void;
}>();

const settings = useSettings();
const topMenuBar = new MenuItems(
  handleFromWebClick,
  handleFromOurExampleClick,
  showUrlDialog,
  showCsvImportDialog,
  showSnapshotDialog,
  showCodeGenerationDialog,
  showDataExportDialog,
  showDataMappingDialog,
  inferSchemaFromSampleData
);

async function handleFromWebClick() {
  emit('show-schemastore-dialog');
}

function handleFromOurExampleClick() {
  emit('show-example-schemas-dialog');
}

function showUrlDialog() {
  emit('show-url-dialog');
}

function showCsvImportDialog() {
  emit('show-import-csv-dialog');
}

function showSnapshotDialog() {
  emit('show-snapshot-dialog');
}

function showCodeGenerationDialog(schemaMode: boolean) {
  emit('show-codegen-dialog', schemaMode);
}

function showDataExportDialog(schemaMode: boolean) {
  emit('show-data-export-dialog', schemaMode);
}

function showDataMappingDialog() {
  emit('show-data-mapping-dialog');
}

function inferSchemaFromSampleData() {
  const data = getDataForMode(SessionMode.DataEditor).data.value;
  const inferredSchema = inferJsonSchema(data);
  if (inferredSchema) {
    getSchemaForMode(SessionMode.DataEditor).schemaRaw.value = inferredSchema;
  }
}

function getMenuItems(settings: SettingsInterfaceRoot, positionBottom: boolean): MenuItem[] {
  let result: MenuItem[];

  switch (props.currentMode) {
    case SessionMode.DataEditor:
      result = topMenuBar.getDataEditorMenuItems(settings);
      break;
    case SessionMode.SchemaEditor:
      result = topMenuBar.getSchemaEditorMenuItems(settings);
      break;
    case SessionMode.Settings:
      result = topMenuBar.getSettingsMenuItems(settings);
      break;
    default:
      return [];
  }
  result = result.filter(menuItem => {
    let itemIsForBottom = true;
    if (menuItem.position && menuItem.position == 'top') {
      itemIsForBottom = false;
    }
    return itemIsForBottom === positionBottom;
  });
  return result;
}

// computed property function to get menu items to allow for updating of the menu items
const menuItems = computed(() => getMenuItems(settings.value, props.showBottomMenu));

const itemMenuRefs = ref(new Map<string, typeof Menu>());

function setItemMenuRef(item: MenuItem, menu: typeof Menu) {
  itemMenuRefs.value.set(getLabelOfItem(item), menu);
}
function handleItemButtonClick(item: MenuItem, event: Event) {
  if (item.items) {
    const label = getLabelOfItem(item);
    if (label !== undefined) {
      const menu = itemMenuRefs.value.get(label);
      menu.toggle(event);
    }
  } else if (item.command) {
    item.command({item, originalEvent: event});
  }
}
function getLabelOfItem(item: MenuItem): string | undefined {
  if (!item.label) {
    return undefined;
  }
  if (typeof item.label === 'string') {
    return item.label;
  }
  return item.label();
}

function isDisabled(item: MenuItem) {
  if (!item.disabled) {
    return false;
  }
  if (typeof item.disabled === 'boolean') {
    return item.disabled;
  }
  return item.disabled();
}
function isHighlighted(item: MenuItem) {
  if (!item.highlighted) {
    return false;
  }
  if (typeof item.highlighted === 'boolean') {
    return item.highlighted;
  }
  return item.highlighted();
}
</script>

<template>
  <!-- menu items -->
  <div v-for="item in menuItems" :key="item.label">
    <span v-if="item.separator" class="text-lg p-2 text-gray-300">|</span>
    <Button
      v-else
      circular
      text
      :class="{'toolbar-button': true, 'highlighted-icon': isHighlighted(item)}"
      size="small"
      v-tooltip.right="item.label"
      :id="item.key ?? ''"
      :disabled="isDisabled(item)"
      @click="event => handleItemButtonClick(item, event)">
      <FontAwesomeIcon :icon="item.icon!!" />
    </Button>

    <Menu
      v-if="item.items"
      :model="item.items"
      :popup="true"
      :ref="itemMenu => setItemMenuRef(item, itemMenu)">
      <template #itemicon="slotProps">
        <div v-if="slotProps.item.icon !== undefined">
          <FontAwesomeIcon
            :icon="slotProps.item.icon ?? []"
            style="min-width: 1.5rem"
            class="mr-3" />
        </div>
      </template>
    </Menu>
  </div>
</template>

<style scoped>
.toolbar-button {
  font-weight: bold;
  font-size: large;
  color: var(--p-primary-active-color);
  padding: 0.35rem !important;
}

.highlighted-icon {
  color: var(--p-highlight-color) !important;
}
</style>
