<script setup lang="ts">
import {type Ref, ref} from 'vue';
import type {MenuItem} from 'primevue/menuitem';
import Menu from 'primevue/menu';
import {useSessionStore} from '@/store/sessionStore';
import Button from 'primevue/button';

import InputText from 'primevue/inputtext';
import {useMagicKeys, watchDebounced} from '@vueuse/core';
import {searchInDataAndSchema, searchResultToMenuItem} from '@/utility/search';
import {focus} from '@/utility/focusUtils';

import {GuiConstants} from '@/constants';

import {getSessionForMode} from '@/data/useDataLink';
import {useErrorService} from '@/utility/errorServiceInstance';

const searchTerm: Ref<string> = ref('');

useMagicKeys({
  passive: false,
  onEventFired(event) {
    if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
      const fromAce = (window as any).__fromAceEditor;
      const searchBarFocused = document.activeElement?.id === 'searchBar';
      if (fromAce || searchBarFocused) {
        event.preventDefault();
        focus('searchBar');
      }
    }
  },
});
const searchResultMenu = ref();
const searchResultItems = ref<MenuItem[]>([]);

watchDebounced(
  [searchTerm],
  () => {
    let mode = useSessionStore().currentMode;
    let session = getSessionForMode(mode);

    if (!searchTerm.value) {
      session.currentSearchResults.value = [];
      searchResultItems.value = [];
      return;
    }
    searchInDataAndSchema(searchTerm.value)
      .then(searchResults => {
        if (searchResults.length > 0) {
          session.currentSelectedElement.value = searchResults[0].path;
        }
        session.currentSearchResults.value = searchResults;
        searchResultItems.value = searchResults
          .map(res => searchResultToMenuItem(res))
          .slice(0, GuiConstants.MAX_SEARCH_RESULTS);
      })
      .catch(error => {
        useErrorService().onError(error);
      });
  },
  {debounce: 500}
);

const showSearchResultsMenu = event => {
  searchResultMenu.value?.show(event, event.target);
  focus('searchBar');
};
import {computed} from 'vue';
let mode = useSessionStore().currentMode;
let session = getSessionForMode(mode);
const currentIndex = computed(() => {
  if (!session.currentSelectedElement.value || session.currentSearchResults.value.length === 0)
    return 0;
  return (
    session.currentSearchResults.value.findIndex(
      r => r.path === session.currentSelectedElement.value
    ) + 1
  ); // +1 for 1-based index
});
const totalMatches = computed(() => session.currentSearchResults.value.length);

function goNext() {
  const results = session.currentSearchResults.value;
  if (results.length === 0) return;

  const idx = results.findIndex(r => r.path === session.currentSelectedElement.value);
  const nextIdx = (idx + 1) % results.length;
  session.currentSelectedElement.value = results[nextIdx].path;
}
function goPrev() {
  const results = session.currentSearchResults.value;
  if (results.length === 0) return;

  const idx = results.findIndex(r => r.path === session.currentSelectedElement.value);
  const prevIdx = (idx - 1 + results.length) % results.length;
  session.currentSelectedElement.value = results[prevIdx].path;
}
</script>

<template>
  <span class="p-input-icon-left ml-5 flex items-center" style="width: 14rem">
    <i class="pi" style="font-size: 0.9rem" />
    <InputText
      show-clear
      class="h-7 w-full"
      placeholder="Search for data or property"
      v-model="searchTerm"
      @focus="showSearchResultsMenu"
      @blur="() => searchResultMenu.value?.hide()"
      id="searchBar" />
  </span>
  <div class="search-controls" v-if="searchTerm">
    <span class="search-counter ml-1">{{ currentIndex }}/{{ totalMatches }}</span>
    <Button
      v-tooltip.bottom="'Previous match'"
      class="ml-1 p-button-sm search-nav-btn"
      text
      :disabled="totalMatches === 0"
      @click="goPrev">
      <i class="pi pi-chevron-up" />
    </Button>
    <Button
      v-tooltip.bottom="'Next match'"
      class="p-button-sm search-nav-btn"
      text
      :disabled="totalMatches === 0"
      @click="goNext">
      <i class="pi pi-chevron-down" />
    </Button>
  </div>
  <!-- search results menu -->
  <Menu :popup="true" ref="searchResultMenu" :model="searchResultItems" class="search-results-menu">
    <template #item="slotProps">
      <div class="px-3 py-2">
        <div class="font-bold">{{ slotProps.item.label }}</div>
        <div class="text-xs">{{ slotProps.item.data }}</div>
      </div>
    </template>
  </Menu>
  <Button class="toolbar-button" text :disabled="!searchTerm" @click="() => (searchTerm = '')">
    <i class="pi pi-times" />
  </Button>
</template>

<style>
.search-results-menu .p-menu-list {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
.search-nav-btn {
  min-width: 1.6rem;
  height: 1.6rem;
  padding: 0 !important;
  font-size: 0.75rem;
  color: var(--p-primary-active-color);
}
.search-nav-btn:hover:enabled {
  background-color: var(--surface-hover);
}
.search-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.search-counter {
  font-size: 0.85rem;
  color: var(--text-color);
}
.search-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.5rem;
}
.toolbar-button {
  font-weight: bold;
  font-size: large;
  color: var(--p-primary-active-color);
  padding: 0.35rem !important;
}
</style>
