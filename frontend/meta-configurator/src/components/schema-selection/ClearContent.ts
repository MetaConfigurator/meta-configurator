import * as ace from 'brace';
export function clearTextEditorContent(editor: ace.Editor): void {
    if (editor && typeof editor.setValue === 'function') {
        // Clear the content of the editor
        editor.setValue('');

    }
}