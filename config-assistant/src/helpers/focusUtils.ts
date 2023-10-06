import {pathToString} from '@/helpers/pathHelper';
import type {Path} from '@/model/path';

export function focus(id: string) {
  window.setTimeout(function () {
    const element = document.getElementById(id);
    if (element) {
      element.focus();
    }
  }, 0);
}

export function focusOnPath(path: Path) {
  focus(pathToString(path));
}

export function selectContents(id: string) {
  window.setTimeout(() => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
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
