import type {CodeEditorWrapper} from '@/components/code-editor/CodeEditorWrapper';
import type {Editor} from 'brace';

export class CodeEditorWrapperUninitialized implements CodeEditorWrapper {
  getContent(): string {
    return '';
  }

  hasRedo(): boolean {
    return false;
  }

  hasUndo(): boolean {
    return false;
  }

  redo(): void {}

  setContent(value: string): void {}

  undo(): void {}
}
