/**
 * Downloads given Markdown content as a .md file.
 * Strips HTML tags (like <div>, <span>, <a id=...>) if cleanMode is enabled.
 */
export function downloadMarkdown(markdown: string, filename = 'schema-documentation.md', cleanMode = false) {
    let content = markdown;

    if (cleanMode) {
        // Remove HTML tags but keep inner text (e.g., remove <div>, <span>, <a id="...">)
        content = content
            .replace(/<a\s+id="[^"]*"><\/a>/g, '') // anchor IDs
            .replace(/<[^>]+>/g, '') // all other tags
            .replace(/&nbsp;/g, ' ')
            .replace(/\r\n/g, '\n'); // normalize line endings
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
