/**
 * Interface for code editors.
 * Makes it possible to replace the code editor implementation (such as AceEditor) by another one.
 * Used in places that access code editor functions without having the need to know about the implementation.
 */
export interface CodeEditorWrapper {
  hasUndo(): boolean;
  hasRedo(): boolean;

  undo(): void;
  redo(): void;
  reset(): void;

  getContent(): string;
  setContent(value: string): string;
  getUndoManager(): void;
}
