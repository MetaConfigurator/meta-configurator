<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
import {getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {schemaToMarkdown} from '@/utility/documentation/schemaToMarkdown';
import {downloadMarkdown} from '@/components/panels/documentation/downloadMarkdown';
import showdown from 'showdown';
import type {Path} from '@/utility/path';
import {asciiToPath, pathToAscii} from '@/utility/pathUtils';
import {getSchemaTitle} from '@/schema/schemaReadingUtils';
import {
  findBestMatchingData,
  findBestMatchingNodeData,
} from '@/schema/graph-representation/graphUtils';
import {constructSchemaGraph} from '@/schema/graph-representation/schemaGraphConstructor';
import {useSettings} from '@/settings/useSettings';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const schema = getSchemaForMode(SessionMode.DataEditor);
const schemaSession = getSessionForMode(SessionMode.SchemaEditor);
const schemaPreprocessed = computed(() => schema.schemaPreprocessed.value);
const schemaGraph = computed(() =>
  constructSchemaGraph(schemaPreprocessed.value, useSettings().value.documentation.mergeAllOfs)
);
const markdown = computed(() =>
  schemaToMarkdown(
    schemaPreprocessed.value,
    getSchemaTitle(schema.schemaWrapper.value),
    schemaGraph.value
  )
);

const converter = new showdown.Converter({
  tables: true,
  ghCompatibleHeaderId: true,
  requireSpaceBeforeHeadingText: true,
});
const renderedHtml = computed(() => converter.makeHtml(markdown.value));

// DOM ref for rendered markdown
const docsRef = ref<HTMLElement | null>(null);

// scroll when selection changes
watch(
  () => schemaSession.currentSelectedElement.value,
  path => {
    const targetNode = findBestMatchingNodeData(schemaGraph.value.nodes, path);
    const targetData = findBestMatchingData(targetNode, path);
    if (targetData) {
      // if target data is found, update the path to the node
      path = targetData.absolutePath;
    }
    scrollToPath(path);
  },
  {deep: true}
);

function scrollToPath(path: Path | null) {
  if (!path) return;
  const anchorId = pathToAscii(path);
  const el = document.getElementById(anchorId);
  el?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function handleDownloadClick() {
  downloadMarkdown(markdown.value);
}

// anchor click handler
function onAnchorClick(evt: MouseEvent) {
  const target = evt.target as HTMLElement;
  if (target.tagName !== 'A') return;
  const href = (target as HTMLAnchorElement).getAttribute('href');
  if (!href?.startsWith('#')) return;

  evt.preventDefault(); // stop browser default jump
  const id = href.slice(1); // remove '#'
  try {
    const path = asciiToPath(id); // reverse mapping
    schemaSession.currentSelectedElement.value = path; // sync to other view
    scrollToPath(path); // smooth scroll (optional)
  } catch (e) {
    console.warn('Invalid anchor id:', id, e);
  }
}

onMounted(() => docsRef.value?.addEventListener('click', onAnchorClick));
onUnmounted(() => docsRef.value?.removeEventListener('click', onAnchorClick));
</script>

<template>
  <div class="documentation-panel">
    <PanelSettings panel-name="Documentation View" :panel-settings-path="['documentation']">
      <p>
        This panel provides documentation for the current schema. It is generated from the schema
        itself and includes details about properties, types, and descriptions.
      </p>
      <p>
        The schema documentation is generated in Markdown format and rendered as HTML. It can also
        be downloaded as a Markdown file for offline viewing or sharing.
      </p>
    </PanelSettings>
    <div ref="docsRef" class="rendered-docs" v-html="renderedHtml"></div>
    <div style="text-align: center; margin-top: 1rem">
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
/* Style for all unordered lists in rendered docs */
.rendered-docs ul {
  list-style-type: disc;
  margin: 0.8em 0 0.8em 1.5em; /* vertical spacing and indentation */
  padding-left: 0;
}

/* Nested unordered lists get increased indentation and different bullet style */
.rendered-docs ul ul {
  list-style-type: circle;
  margin-left: 1.5em;
  margin-top: 0.4em;
  margin-bottom: 0.4em;
}

.rendered-docs ul ul ul {
  list-style-type: square;
  margin-left: 1.5em;
  margin-top: 0.3em;
  margin-bottom: 0.3em;
}

/* List items spacing */
.rendered-docs li {
  margin: 0.2em 0;
  line-height: 1.4;
}

/* Links inside list items */
.rendered-docs li a {
  color: var(--p-primary-active-color);
  text-decoration: none;
}

.rendered-docs li a:hover {
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
