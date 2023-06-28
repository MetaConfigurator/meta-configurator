import type {Path} from '@/model/path';
import type {Position} from 'brace';

export interface ConfigManipulator {
  determineCursorPosition(editorContent: string, currentPath: Path): Position;
  determinePath(editorContent: string, targetCharacter: number): Path;
}
