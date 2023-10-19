import type {CodeEditorWrapper} from '@/components/code-editor/CodeEditorWrapper';
import type {Editor} from 'brace';

/**
 * CodeEditorWrapper implementation for AceEditor.
 */
export class CodeEditorWrapperAce implements CodeEditorWrapper {
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  getContent(): string {
    return this.editor.getValue();
  }

  hasRedo(): boolean {
    return this.editor.getSession().getUndoManager().hasRedo();
  }

  hasUndo(): boolean {
    return this.editor.getSession().getUndoManager().hasUndo();
  }

  redo(): void {
    if (this.hasRedo()) {
      this.editor.getSession().getUndoManager().redo(true);
    }
  }

  getUndoManager(): void {
    this.editor.getSession().getUndoManager();
  }

  setContent(value: string): string {
    return this.editor.setValue(value, 1);
  }

  undo(): void {
    if (this.hasUndo()) {
      this.editor.getSession().getUndoManager().undo();
    }
  }

  reset() {
    this.editor.getSession().getUndoManager().reset();
  }
}
