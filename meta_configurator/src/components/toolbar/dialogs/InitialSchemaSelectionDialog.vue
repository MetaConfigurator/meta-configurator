<!-- Dialog to select the initial schema -->
<script setup lang="ts">
import {defineEmits, ref, watch} from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

const showDialog = ref(false);

const categories = ref<Array<{name: string; key: 'Example' | 'JsonStore' | 'File' | 'URL'}>>([
  {name: 'Example Schema', key: 'Example'},
  {name: 'From Json Schema Store', key: 'JsonStore'},
  {name: 'Open Schema File', key: 'File'},
  {name: 'Load Schema from URL', key: 'URL'},
]);

defineEmits<{
  (e: 'user_selected_option', option: 'Example' | 'JsonStore' | 'File' | 'URL'): void;
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
    <div class="flex flex-column gap-3 bigger-dialog-content">
      <div v-for="category in categories" :key="category.key" class="flex align-items-center">
        <Button
          v-model="selectedCategory"
          :label="category.name"
          :inputId="category.key"
          name="category"
          :value="category.name"
          @click="
            () => {
              $emit('user_selected_option', category.key);
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
