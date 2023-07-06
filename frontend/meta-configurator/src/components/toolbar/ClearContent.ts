import * as ace from 'brace';
export function clearTextEditorContent(editor: ace.Editor): void {
  console.log('clearTextEditorContent called');
  if (editor) {
    // Clear the content of the text editor
    //editor.session.setValue('{ }');
    editor.session.setValue('');
  }
}


