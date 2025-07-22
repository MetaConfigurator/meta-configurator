<!--
Dialog that shows news about the application.
Emits an update:visible event when the dialog is closed.
-->
<script setup lang="ts">
import Dialog from 'primevue/dialog';
import {CURRENT_NEWS, CURRENT_NEWS_HEADER} from '@/components/toolbar/currentNews';
import {ref} from 'vue';
import Checkbox from 'primevue/checkbox';

defineProps<{visible: boolean}>();

defineEmits<{
  (e: 'update:visible', newValue: boolean, dontShowAgain: boolean): void;
}>();

const dontShowAgain = ref(false);
</script>

<template>
  <Dialog
    :header="CURRENT_NEWS_HEADER"
    :visible="visible"
    @update:visible="newValue => $emit('update:visible', newValue, dontShowAgain)">
    <div class="rendered-news" v-html="CURRENT_NEWS"></div>
    <div class="dont-show-again">
      <Checkbox v-model="dontShowAgain" input-id="dont-show-again" binary />
      <label for="dont-show-again">Don't show again</label>
    </div>
  </Dialog>
</template>

<style>
.rendered-news {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
  font-size: 16px;
  line-height: 1.6;
  color: var(--p-primary-active-color);
  background-color: var(--p-primary-background);
  white-space: normal;
  font-family: 'Segoe UI', sans-serif;
  scroll-behavior: smooth;
  position: relative;
}

.rendered-news a {
  color: var(--p-primary-color);
  font-weight: 500;
  transition: color 0.2s;
}

.rendered-news a:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.dont-show-again {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  font-size: 15px;
  color: #555;
}
</style>
