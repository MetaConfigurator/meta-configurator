<script setup lang="ts">
import TextPanel from './components/TextPanel.vue';
import TextPanel2 from '@/components/TextPanel2.vue';
</script>

<template>
  <div class='w-screen h-screen'>
    <header></header>
    <main class='container flex w-screen h-screen'>
      <TextPanel class='flex-initial w-full' />
      <TextPanel2 class='flex-initial w-full' />
    </main>
  </div>
</template>

<style scoped></style>
