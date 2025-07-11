<script setup lang="ts">
import { SessionMode } from '@/store/sessionMode';
import { computed } from 'vue';
import { getDataForMode } from '@/data/useDataLink';
import { schemaToMarkdown } from '@/utility/documentation/schemaToMarkdown';
import { downloadMarkdown } from '@/components/panels/documentation/downloadMarkdown';
import showdown from 'showdown';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const schemaData = getDataForMode(SessionMode.SchemaEditor);

const markdown = computed(() => schemaToMarkdown(schemaData.data.value));

const converter = new showdown.Converter({
  tables: true,
  ghCompatibleHeaderId: true,
  requireSpaceBeforeHeadingText: true,
});
const renderedHtml = computed(() => converter.makeHtml(markdown.value));

function handleDownloadClick() {
  const markdownText = schemaToMarkdown(schemaData.data.value);
  downloadMarkdown(markdownText);
}
</script>

<template>
  <div class="documentation-panel">
    <label class="heading">Documentation View</label>
    <div class="rendered-docs" v-html="renderedHtml"></div>
    <div style="text-align: center; margin-top: 1rem;">
      <button class="download-btn" @click="handleDownloadClick">Download as Markdown</button>
    </div>
  </div>
</template>

<style>
.documentation-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.heading {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin: 1rem auto 0.5rem;
  color: var(--p-primary-active-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rendered-docs {
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

.rendered-docs h1[id],
.rendered-docs h2[id],
.rendered-docs h3[id],
.rendered-docs h4[id] {
  scroll-margin-top: 80px;
}

.rendered-docs h1,
.rendered-docs h2,
.rendered-docs h3,
.rendered-docs h4,
.rendered-docs p,
.rendered-docs td,
.rendered-docs th {
  color: var(--p-primary-active-color);
}

.rendered-docs h1,
.rendered-docs h2,
.rendered-docs h3,
.rendered-docs h4 {
  font-weight: bold;
  display: block;
  margin-top: 1.25em;
}

.rendered-docs h1 {
  font-size: 32px;
  margin: 2rem 0 1rem;
}

.rendered-docs h2 {
  font-size: 26px;
  margin: 1.75rem 0 0.75rem;
}

.rendered-docs h3 {
  font-size: 22px;
  margin: 1.5rem 0 0.5rem;
}

.rendered-docs h4 {
  font-size: 18px;
  margin: 1.25rem 0 0.5rem;
}

.rendered-docs .toc-wrapper {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.rendered-docs .toc-wrapper h3 {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.rendered-docs .toc-links {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  line-height: 0.5;
}

.rendered-docs .toc-links a {
  white-space: nowrap;
  text-decoration: none;
  color: var(--p-primary-active-color);
}

.rendered-docs .toc-links a:hover {
  text-decoration: underline;
}

.rendered-docs hr {
  border: none;
  border-top: 1px solid var(--p-border-color, #555);
  margin: 2rem 0;
}

.rendered-docs table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 1em;
  margin-bottom: 2em;
  background-color: var(--p-primary-background);
  font-size: 15px;
}

.rendered-docs th,
.rendered-docs td {
  border: 1px solid var(--p-primary-background, #444);
  padding: 8px 12px;
  text-align: left;
}

.rendered-docs th {
  background-color: var(--p-primary-background);
  font-weight: bold;
}

.rendered-docs td {
  background-color: var(--p-primary-background);
}

.rendered-docs pre {
  background-color: var(--p-highlight-background, var(--p-primary-hover-color));
  color: var(--p-primary-active-color);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 1em;
}

.download-btn {
  background-color: var(--p-primary-background);
  color: var(--p-primary-active-color);
  border: 1px solid var(--p-border-color, #666);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.download-btn:hover {
  background-color: var(--p-highlight-color);
}
</style>