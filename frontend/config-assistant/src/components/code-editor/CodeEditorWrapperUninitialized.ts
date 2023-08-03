import type {CodeEditorWrapper} from '@/components/code-editor/CodeEditorWrapper';

export class CodeEditorWrapperUninitialized implements CodeEditorWrapper {
  getContent(): string {
    return '';
  }

  reset(): void {}

  hasRedo(): boolean {
    return false;
  }

  hasUndo(): boolean {
    return false;
  }

  redo(): void {}

  setContent(value: string): string {
    return '';
  }

  undo(): void {}
}
