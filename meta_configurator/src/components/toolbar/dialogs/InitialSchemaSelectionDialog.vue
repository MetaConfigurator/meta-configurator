<!-- Dialog to select the initial schema -->
<script setup lang="ts">
import {defineEmits, ref, watch} from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import {SCHEMA_SELECTION_CATEGORIES} from '@/components/toolbar/schemaSelectionCategories';

const showDialog = ref(false);

defineEmits<{
  (e: 'user_selected_default_option', option: 'JsonStore' | 'File' | 'URL'): void;
  (e: 'user_selected_custom_option', label: string): void;
}>();

const selectedCategory = ref();

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

// Watch for changes in selectedCategory and close the dialog if it's not null
watch(selectedCategory, newValue => {
  if (newValue !== null) {
    hideDialog();
  }
});

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Select a Schema">
    <div class="flex flex-col gap-3 bigger-dialog-content">
      <div
        v-for="category in SCHEMA_SELECTION_CATEGORIES"
        :key="category.key"
        class="flex justify-center">
        <Button
          v-model="selectedCategory"
          :label="category.name"
          :inputId="category.key"
          name="category"
          :value="category.name"
          class="w-full"
          @click="
            () => {
              if (category.key === 'Custom') {
                $emit('user_selected_custom_option', category.name);
              } else {
                $emit('user_selected_default_option', category.key);
              }
              hideDialog();
            }
          " />
      </div>
    </div>
  </Dialog>
</template>
<style scoped>
.bigger-dialog-content {
  padding: 20px;
}
</style>
