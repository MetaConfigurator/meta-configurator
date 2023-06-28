<template>
  <div>
    <TopMenuBar @menuItemSelected="handleMenuItemSelected" />
    <div v-if="selectedOption === 'json'">
      <AceEditor />
    </div>
    <div v-else-if="selectedOption === 'yaml'">
      <AceEditorForYaml />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import {TopMenuBar} from "@/components/toolbar/TopMenuBar";
import AceEditor from "@/components/code-editor/AceEditor.vue";
import AceEditorForYaml from "@/components/code-editor/AceEditorForYaml.vue";

const selectedOption = ref('');

function handleMenuItemSelected(event, option) {
  selectedOption.value = option;
}
</script>
