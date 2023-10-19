<!-- Component for Code Editor that shows an AceEditor instance depending on the data format.
This is needed so that whenever the user changes the data format a different AceEditor instance is shown,
 instead of using the same instance and only changing the data-format variable (which would lead to different problems).
 -->

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
