<script setup lang="ts">
import { SessionMode } from '@/store/sessionMode';
import { computed } from 'vue';
import { getDataForMode } from '@/data/useDataLink';
import { schemaToMarkdown } from '@/utility/documentation/schemaToMarkdown';
import { downloadMarkdown } from '@/utility/downloadMarkdown';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const schemaData = getDataForMode(SessionMode.SchemaEditor);

function basicMarkdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const htmlLines: string[] = [];

  let inCode = false;
  let codeLang = '';
  let inList = false;

  for (let line of lines) {
    line = line.trim();

    // Headings with anchors
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const rawText = headingMatch[2];
      const id = rawText
          .toLowerCase()
          .replace(/\*\*/g, '')        // remove bold markers
          .replace(/[^\w\s-]/g, '')    // remove special characters
          .trim()
          .replace(/\s+/g, '-');       // kebab-case

      const content = parseInline(rawText);
      htmlLines.push(`<h${level} id="${id}">${content}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (line === '---') {
      htmlLines.push('<hr>');
      continue;
    }

    // Code block start/end
    if (line.startsWith('```')) {
      if (inCode) {
        htmlLines.push('</code></pre>');
        inCode = false;
      } else {
        codeLang = line.slice(3).trim();
        htmlLines.push(`<pre><code class="language-${codeLang || 'text'}">`);
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      htmlLines.push(line);
      continue;
    }

    // List items
    if (line.startsWith('- ')) {
      if (!inList) {
        inList = true;
        htmlLines.push('<ul>');
      }
      htmlLines.push(`<li>${parseInline(line.slice(2))}</li>`);
      continue;
    } else if (inList) {
      inList = false;
      htmlLines.push('</ul>');
    }

    // Table row
    if (line.startsWith('|') && line.endsWith('|')) {
      htmlLines.push(line);
      continue;
    }

    // Empty line = spacing
    if (line === '') {
      htmlLines.push('<br>');
      continue;
    }

    htmlLines.push(`<p>${parseInline(line)}</p>`);
  }

  if (inList) htmlLines.push('</ul>');
  if (inCode) htmlLines.push('</code></pre>');

  return formatTables(htmlLines).join('\n');
}

function parseInline(text: string): string {
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return text;
}

function formatTables(lines: string[]): string[] {
  const output: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  for (const line of lines) {
    if (line.startsWith('|') && line.endsWith('|')) {
      tableRows.push(line);
      inTable = true;
    } else {
      if (inTable) {
        output.push(tableToHtml(tableRows));
        tableRows = [];
        inTable = false;
      }
      output.push(line);
    }
  }

  if (inTable) {
    output.push(tableToHtml(tableRows));
  }

  return output;
}

function tableToHtml(rows: string[]): string {
  const header = rows[0];
  const body = rows.slice(2);

  const headers = header
      .split('|')
      .slice(1, -1)
      .map((cell) => `<th>${cell.trim()}</th>`)
      .join('');

  const rowsHtml = body
      .map((row) => {
        const cells = row
            .split('|')
            .slice(1, -1)
            .map((cell) => `<td>${cell.trim()}</td>`)
            .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

  return `<table><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

const markdown = computed(() => schemaToMarkdown(schemaData.data.value));
const renderedHtml = computed(() => basicMarkdownToHtml(markdown.value));

function handleDownloadClick() {
  const markdownText = schemaToMarkdown(schemaData.data.value);
  downloadMarkdown(markdownText);
}

</script>

<template>
  <div class="documentation-panel">
    <label class="heading">Documentation View</label>
    <div class="rendered-docs" v-html="renderedHtml" />
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
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rendered-docs {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
  font-size: 16px;
  line-height: 1.6;
  color: #e0e0e0;
  white-space: normal;
  font-family: 'Segoe UI', sans-serif;
}

.rendered-docs h1,
.rendered-docs h2,
.rendered-docs h3,
.rendered-docs h4 {
  font-weight: bold;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: #ffffff;
}

.rendered-docs h1 {
  font-size: 28px;
  font-weight: bold;
  margin: 2rem 0 1rem;
}
.rendered-docs h2 {
  font-size: 22px;
  font-weight: bold;
  margin: 1.75rem 0 0.75rem;
}
.rendered-docs h3 {
  font-size: 17px;
  font-weight: bold;
  margin: 1.5rem 0 0.5rem;
}
.rendered-docs h4 {
  font-size: 16px;
  font-weight: bold;
  margin: 1.25rem 0 0.5rem;
}

.rendered-docs hr {
  border: none;
  border-top: 1px solid #555;
  margin: 2rem 0;
}

.rendered-docs table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 1em;
  margin-bottom: 2em;
  background: #1a1a1a;
  font-size: 15px;
}

.rendered-docs th,
.rendered-docs td {
  border: 1px solid #444;
  padding: 8px 12px;
  text-align: left;
}

.rendered-docs th {
  background-color: #2a2a2a;
  font-weight: bold;
}

.rendered-docs pre {
  background-color: #1e1e1e;
  color: #eee;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 1em;
}

.download-btn {
  background-color: #3a3a3a;
  color: #fff;
  border: 1px solid #666;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.download-btn:hover {
  background-color: #555;
}

</style>
