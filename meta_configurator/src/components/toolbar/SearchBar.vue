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
    if (event.key === 'f' && event.ctrlKey) {
      event.preventDefault();
      focus('searchBar');
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
</script>

<template>
  <span class="p-input-icon-left ml-5" style="width: 14rem">
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
  <!-- search results menu -->
  <Menu :popup="true" ref="searchResultMenu" :model="searchResultItems">
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

<style scoped>
.toolbar-button {
  font-weight: bold;
  font-size: large;
  color: var(--p-primary-active-color);
  padding: 0.35rem !important;
}
</style>
