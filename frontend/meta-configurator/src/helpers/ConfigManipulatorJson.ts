
import type {Path} from '@/model/path';
import type {ConfigManipulator} from '@/helpers/ConfigManipulator';
import type {Position} from 'brace';
import type {
  CstDocument,
  CstNode,
} from 'json-cst';
import {parse} from 'json-cst';

export class ConfigManipulatorJson implements ConfigManipulator {
  constructor() {}

  determineCursorPosition(editorContent: string, currentPath: Path): Position {
    // todo: implement

    return {
      row: 4,
      column: 0,
    };
  }

  determinePath(editorContent: string, targetCharacter: number): Path {
    let cst: CstDocument = parse(editorContent);
    let result = this.determinePathNew(cst.root, targetCharacter) || [];
    console.log(result);
    return result;
  }

  private determinePathNew(currentNode: CstNode, targetCharacter: number): Path | undefined {
    if (currentNode.kind == 'object') {
      if (targetCharacter > currentNode.range.start && targetCharacter < currentNode.range.end) {
        for (let childNode of currentNode.children) {
          let childPath = this.determinePathNew(childNode, targetCharacter);
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
        let childPath = this.determinePathNew(currentNode.valueNode, targetCharacter);
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
        for (let childNode of currentNode.children) {
          let childPath = this.determinePathNew(childNode, targetCharacter);
          if (childPath !== undefined) {
            let result_list: Path = [index];
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
        let childPath = this.determinePathNew(currentNode.valueNode, targetCharacter);
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
