import {Editor, type Position} from 'brace';
import type {Path} from '@/utility/path';
import {usePathIndexLink} from '@/dataformats/formatRegistry';

/**
 * Determines the cursor position for the given path.
 *
 * @param editor      the ace editor
 * @param editorContent the current value of the editor content
 * @param currentPath the path to determine the cursor position for
 */
export function determineCursorPosition(
  editor: Editor,
  editorContent: string,
  currentPath: Path
): Position {
  const index = usePathIndexLink().determineIndexOfPath(editorContent, currentPath);
  return editor.session.doc.indexToPosition(index, 0);
}

/**
 * Updates the cursor position based on the given path.
 * @param editor      the ace editor
 * @param editorContent the current value of the editor content
 * @param currentPath the path to update the cursor position to
 */
export function updateCursorPositionBasedOnPath(
  editor: Editor,
  editorContent: string,
  currentPath: Path
) {
  const position = determineCursorPosition(editor, editorContent, currentPath);
  editor.gotoLine(position.row + 1, position.column, true); // row is 1-based, column is 0-based
}

/**
 * Determines the path for the current cursor position.
 * @param editor the ace editor
 * @param editorContent the current value of the editor content
 */
export function determinePath(editor: Editor, editorContent: string): Path {
  const targetCharacter = editor.session.doc.positionToIndex(editor.getCursorPosition(), 0);
  return usePathIndexLink().determinePathFromIndex(editorContent, targetCharacter);
}
