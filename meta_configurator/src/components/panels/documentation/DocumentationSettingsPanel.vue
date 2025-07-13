<script setup lang="ts">
import Panel from 'primevue/panel';
import {useSettings} from '@/settings/useSettings';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';

const settings = useSettings();
</script>

<template>
  <Panel header="Documentation View" toggleable :collapsed="true">
    <div class="p-5 space-y-3 flex flex-col">
      <label class="font-semibold">Documentation Settings</label>
      <div class="flex flex-col gap-2">
        <label for="mergeAllOfs" class="flex items-center gap-2">
          <Checkbox id="mergeAllOfs" v-model="settings.documentation.mergeAllOfs" binary />
          Merge allOfs
        </label>
        <label for="enumMaxCountToShowWithoutSpoiler" class="flex items-center gap-2">
          <InputNumber
            class="fixed-width-input"
            id="enumMaxCountToShowWithoutSpoiler"
            v-model.number="settings.documentation.enumMaxCountToShowWithoutSpoiler"
            :min="0"
            :inputStyle="{width: '5rem'}" />
          Maximum enumeration count to show without a spoiler (expandable/collapsible)
        </label>
        <label for="repeatMultipleOccurrencesInTableOfContents" class="flex items-center gap-2">
          <Checkbox
            id="repeatMultipleOccurrencesInTableOfContents"
            v-model="settings.documentation.repeatMultipleOccurrencesInTableOfContents"
            binary />
          Repeat multiple occurrences in table of contents
        </label>
      </div>
    </div>
  </Panel>
</template>
