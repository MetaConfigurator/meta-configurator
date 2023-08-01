import type {Path} from '@/model/path';
import type {Position} from 'brace';

export interface CodeEditorWrapper {
  hasUndo(): boolean;
  hasRedo(): boolean;

  undo(): void;
  redo(): void;

  getContent(): string;
  setContent(value: string): void;
}
