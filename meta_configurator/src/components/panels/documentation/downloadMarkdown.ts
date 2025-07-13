import {cleanMarkdownContent} from '@/utility/documentation/documentationUtils';

/**
 * Downloads given Markdown content as a .md file.
 * Strips HTML tags (like <div>, <span>, <a id=...>) if cleanMode is enabled.
 */
export function downloadMarkdown(
  markdown: string,
  filename = 'schema-documentation.md',
  cleanMode = false
) {
  let content = markdown;

  if (cleanMode) {
    content = cleanMarkdownContent(markdown);
  }

  const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
