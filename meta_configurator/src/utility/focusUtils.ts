import {pathToString} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';

/**
 * Focuses the element with the given id.
 * @param id the id of the element to focus
 */
export function focus(id: string) {
  window.setTimeout(function () {
    const element = document.getElementById(id);
    if (element) {
      element.focus();
    }
  }, 0);
}

/**
 * Focuses the element with the given path.
 * It is assumed that the corresponding element has an id that is equal to the path
 * (using pathToString).
 * @see pathToString
 * @param path
 */
export function focusOnPath(path: Path) {
  focus(pathToString(path));
}

/**
 * Makes the element with the given id editable and selects its contents.
 * @param id the id of the element
 */
export function makeEditableAndSelectContents(id: string) {
  window.setTimeout(() => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    element.contentEditable = 'true';
    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    if (!sel) {
      return;
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }, 0);
}
