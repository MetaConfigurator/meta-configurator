<script setup lang="ts">
import {computed} from 'vue';
import type {MenuItem, MenuItemCommandEvent} from 'primevue/menuitem';
import Menu from 'primevue/menu';
import {MenuItems, type MenuItemDialogActions} from '@/components/toolbar/menuItems';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';

import {SessionMode} from '@/store/sessionMode';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  currentMode: SessionMode;
  showBottomMenu: boolean;
  dialogActions: MenuItemDialogActions;
}>();

const settings = useSettings();
const menuItemsProvider = new MenuItems(props.dialogActions);

function getMenuItemsForCurrentMode(currentSettings: SettingsInterfaceRoot): MenuItem[] {
  switch (props.currentMode) {
    case SessionMode.DataEditor:
      return menuItemsProvider.getDataEditorMenuItems(currentSettings);
    case SessionMode.SchemaEditor:
      return menuItemsProvider.getSchemaEditorMenuItems(currentSettings);
    case SessionMode.Settings:
      return menuItemsProvider.getSettingsMenuItems(currentSettings);
    default:
      return [];
  }
}

const menuItems = computed(() =>
  getMenuItemsForCurrentMode(settings.value).filter(
    menuItem => (menuItem.position !== 'top') === props.showBottomMenu
  )
);

type PopupMenuController = {toggle: (event: Event) => void};
const popupMenuByItem = new WeakMap<MenuItem, PopupMenuController>();

function setPopupMenu(item: MenuItem, menu: PopupMenuController | null): void {
  if (!menu) {
    popupMenuByItem.delete(item);
    return;
  }
  popupMenuByItem.set(item, menu);
}

function handleItemButtonClick(item: MenuItem, event: Event): void {
  if (item.items) {
    popupMenuByItem.get(item)?.toggle(event);
    return;
  }
  item.command?.({item, originalEvent: event} as MenuItemCommandEvent);
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

function getMenuItemKey(item: MenuItem, index: number): string {
  return item.key ?? `${getLabelOfItem(item) ?? 'separator'}-${index}`;
}

function evaluateBooleanProperty(value: boolean | (() => boolean) | undefined): boolean {
  if (!value) {
    return false;
  }
  return typeof value === 'boolean' ? value : value();
}
</script>

<template>
  <div class="toolbar-menu-buttons">
    <!-- menu items -->
    <div v-for="(item, index) in menuItems" :key="getMenuItemKey(item, index)">
      <span v-if="item.separator" class="menu-separator text-lg p-2 text-gray-300">|</span>
      <Button
        v-else
        circular
        text
        :class="{
          'toolbar-button': true,
          'highlighted-icon': evaluateBooleanProperty(item.highlighted),
        }"
        size="small"
        v-tooltip.right="getLabelOfItem(item)"
        :id="item.key ?? ''"
        :disabled="evaluateBooleanProperty(item.disabled)"
        @click="handleItemButtonClick(item, $event)">
        <FontAwesomeIcon v-if="item.icon" :icon="item.icon" />
      </Button>

      <Menu
        v-if="item.items"
        :model="item.items"
        :popup="true"
        :ref="itemMenu => setPopupMenu(item, itemMenu as unknown as PopupMenuController)">
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
  </div>
</template>

<style scoped>
.toolbar-menu-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem;
  min-width: 0;
}

.toolbar-button {
  font-weight: bold;
  font-size: large;
  color: var(--p-primary-active-color);
  padding: 0.35rem !important;
}

.menu-separator {
  display: inline-flex;
  align-items: center;
}

.highlighted-icon {
  color: var(--p-highlight-color) !important;
}

@media (max-width: 900px) {
  .menu-separator {
    display: none;
  }
}
</style>
