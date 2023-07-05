import type {Path} from '@/model/path';
import type {ConfigManipulator} from '@/model/ConfigManipulator';
import type {Position} from 'brace';
import type {CstDocument, CstNode} from 'json-cst';
import {parse} from 'json-cst';
import {useSessionStore} from "@/store/sessionStore";

export class ConfigManipulatorJson implements ConfigManipulator {
  constructor() {}

  determineCursorPosition(editorContent: string, currentPath: Path): number {
    console.log("test, using editorcontent ", editorContent)
    const cst: CstDocument = parse(editorContent);
    console.log("unable to parse cst")
    const result = this.determineCursorPositionStep(cst.root,  currentPath)
    console.log("done")
    return result
  }

  determineCursorPositionStep(currentNode: CstNode, currentPath: Path): number {
    if (currentPath.length == 0) {
      return currentNode.range.start
    }

    const nextKey = currentPath[0];
    console.log("determine position step with path ", currentPath, " and node ", currentNode)

    /*if (currentNode.kind == 'object') {
        for (const childNode of currentNode.children) {
          if (childNode.key == nextKey) {
            return this.determineCursorPositionStep(currentNode, currentPath.slice(0, -1))
          }
        }
        console.log("Unable to find path key ", nextKey, " in children of node ", currentNode);

    } else if (currentNode.kind == 'object-property') {
      return this.determineCursorPositionStep(currentNode.valueNode, currentPath)

    } else if (currentNode.kind == 'array') {
      let index = 0;
      for (const childNode of currentNode.children) {
        if (index == nextKey) {
          return this.determineCursorPositionStep(currentNode, currentPath.slice(0, -1))
        }
        index++;
      }
      console.log("Unable to find path key ", nextKey, " in children of node ", currentNode);

    } else if (currentNode.kind == 'array-element') {
      return this.determineCursorPositionStep(currentNode.valueNode, currentPath)
    }*/
    return currentNode.range.start
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
