import type {Path} from '@/model/path';
import type {ConfigManipulator} from '@/components/code-editor/ConfigManipulator';
import type {CstDocument, CstNode} from 'json-cst';
import {parse} from 'json-cst';
import {errorService} from '@/main';

export class ConfigManipulatorJson implements ConfigManipulator {
  constructor() {}

  parseFileContent(editorContent: string): any {
    return JSON.parse(editorContent);
  }

  stringifyContentObject(content: any): string {
    return JSON.stringify(content, null, 2);
  }

  determineCursorPosition(editorContent: string, currentPath: Path): number {
    try {
      const cst: CstDocument = parse(editorContent);
      return this.determineCursorPositionStep(cst.root, currentPath);
    } catch (e) {
      errorService.onError(e);
      return 0;
    }
  }

  determineCursorPositionStep(currentNode: CstNode, currentPath: Path): number {
    if (currentPath.length == 0) {
      return currentNode.range.end;
    }

    const nextKey = currentPath[0];

    if (currentNode.kind == 'object') {
      for (const childNode of currentNode.children) {
        if (childNode.key == nextKey) {
          return this.determineCursorPositionStep(
            childNode,
            currentPath.slice(1, currentPath.length)
          );
        }
      }
    } else if (currentNode.kind == 'object-property') {
      return this.determineCursorPositionStep(currentNode.valueNode, currentPath);
    } else if (currentNode.kind == 'array') {
      let index = 0;
      for (const childNode of currentNode.children) {
        if (index == nextKey) {
          return this.determineCursorPositionStep(
            childNode,
            currentPath.slice(1, currentPath.length)
          );
        }
        index++;
      }
    } else if (currentNode.kind == 'array-element') {
      return this.determineCursorPositionStep(currentNode.valueNode, currentPath);
    }
    return currentNode.range.start;
  }

  determinePath(editorContent: string, targetCharacter: number): Path {
    const cst: CstDocument = parse(editorContent);
    const result = this.determinePathStep(cst.root, targetCharacter) || [];
    return result;
  }

  private determinePathStep(currentNode: CstNode, targetCharacter: number): Path | undefined {
    if (currentNode.kind == 'object') {
      if (targetCharacter > currentNode.range.start && targetCharacter < currentNode.range.end) {
        for (const childNode of currentNode.children) {
          const childPath = this.determinePathStep(childNode, targetCharacter);
          if (childPath !== undefined) {
            return childPath;
          }
        }
        return [];
      } else {
        return undefined;
      }
    } else if (currentNode.kind == 'object-property') {
      if (targetCharacter > currentNode.range.start && targetCharacter < currentNode.range.end) {
        const childPath = this.determinePathStep(currentNode.valueNode, targetCharacter);
        let resultPath: Path = [currentNode.key];
        if (childPath !== undefined) {
          resultPath = resultPath.concat(childPath);
        }
        return resultPath;
      } else {
        return undefined;
      }
    } else if (currentNode.kind == 'array') {
      if (targetCharacter > currentNode.range.start && targetCharacter < currentNode.range.end) {
        let index = 0;
        for (const childNode of currentNode.children) {
          const childPath = this.determinePathStep(childNode, targetCharacter);
          if (childPath !== undefined) {
            const result_list: Path = [index];
            return result_list.concat(childPath);
          }
          index++;
        }
        return [];
      } else {
        return undefined;
      }
    } else if (currentNode.kind == 'array-element') {
      if (targetCharacter >= currentNode.range.start && targetCharacter < currentNode.range.end) {
        const childPath = this.determinePathStep(currentNode.valueNode, targetCharacter);
        let resultPath: Path = [];
        if (childPath !== undefined) {
          resultPath = resultPath.concat(childPath);
        }
        return resultPath;
      } else {
        return undefined;
      }
    }
  }
}
