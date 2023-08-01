import type {CodeEditorWrapper} from '@/components/code-editor/CodeEditorWrapper';
import type {Editor} from 'brace';

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
    this.editor.getSession().getUndoManager().redo(true);
  }

  setContent(value: string): void {
    this.editor.setValue(value);
  }

  undo(): void {
    this.editor.getSession().getUndoManager().undo(true);
  }
}
