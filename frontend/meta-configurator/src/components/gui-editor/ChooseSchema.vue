<template>
  <input type="file" ref="fileInput" accept=".json" style="display: none">
  <Button @click="uploadSchema" class="p-button-primary" label="Choose Schema" />
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, onMounted } from 'vue';
import Button from 'primevue/button';

const fileInput = ref<HTMLInputElement | null>(null);
const uploadSchema = () => {
  if (fileInput.value) {
    if ("click" in fileInput.value) {
      fileInput.value.click();
    }
  }
};
const handleFileChange = () => {
  const inputElement = fileInput.value;
  const selectedFile = inputElement.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    //const schemaData = JSON.parse(reader.result as string);
    showDialog('Success', 'Schema uploaded successfully.');
  };
  reader.readAsText(selectedFile);
};
const showDialog = (title: string, message: string) => {
  alert(`${title}: ${message}`);
};
const app = getCurrentInstance()?.appContext.app;
if (app) {
  app.config.globalProperties.showDialog = showDialog;
}
onMounted(() => {
  if (fileInput.value) {
    if ("addEventListener" in fileInput.value) {
      fileInput.value.addEventListener("change", handleFileChange);
    }
  }
});
</script>

<style>
.p-button-primary {
  position: absolute;
  top: 80px; /* Adjust top position as needed */
  right:10px; /* Adjust right position as needed */
}
</style>
