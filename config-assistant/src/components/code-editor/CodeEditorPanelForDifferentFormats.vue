<template>
  <AceEditor data-format="json" v-if="settingsStore.settingsData.dataFormat === 'json'" />
  <AceEditor data-format="yaml" v-else-if="settingsStore.settingsData.dataFormat === 'yaml'" />
  <AceEditor data-format="json" v-else />
</template>

<script setup>
import {useSettingsStore} from '@/store/settingsStore';
import AceEditor from '@/components/code-editor/AceEditor.vue';

const settingsStore = useSettingsStore();
</script>
