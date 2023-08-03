export interface CodeEditorWrapper {
  hasUndo(): boolean;
  hasRedo(): boolean;

  undo(): void;
  redo(): void;
  reset(): void;

  getContent(): string;
  setContent(value: string): string;
}
