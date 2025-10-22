import type {PathIndexLink} from '@/dataformats/pathIndexLink';
import {type Path} from '@/utility/path';
import type {
  CstDocument,
  CstNode,
  CstNodeArray,
  CstNodeArrayElement,
  CstNodeObject,
  CstNodeObjectProperty,
} from 'json-cst';
import {parse} from 'json-cst';
import {errorService} from '@/main';
import {pathToJsonPointer, pathToString} from '@/utility/pathUtils';

/**
 * Implementation of PathIndexLink for JSON data.
 */
export class PathIndexLinkJson implements PathIndexLink {
  // cache the cst and the editor content to avoid parsing the same content multiple times
  private _cst: CstDocument | null = null;
  private _editorContent: string | null = null;

  determineIndexOfPath(editorContent: string, currentPath: Path): number {
    if (editorContent.length === 0) {
      return 0;
    }
    try {
      const cst = this.getCst(editorContent);
      return this.determineIndexStep(cst.root, currentPath);
    } catch (e) {
      errorService.onError(e);
      return 0;
    }
  }

  private getCst(editorContent: string): CstDocument {
    if (this._editorContent !== editorContent || this._cst === null) {
      this._cst = parse(editorContent);
      this._editorContent = editorContent;
    }
    return this._cst;
  }

  private determineIndexStep(currentNode: CstNode, currentPath: Path): number {
    switch (currentNode.kind) {
      case 'object':
        return this.determineIndexInObjectNode(currentNode, currentPath);
      case 'array':
        return this.determineIndexInArrayNode(currentNode, currentPath);
      case 'object-property':
      case 'array-element':
        return this.determineIndexStep(currentNode.valueNode, currentPath);
      case 'string':
        return currentNode.range.start;
      case 'number':
      case 'literal':
      default:
        return currentNode.range.start; // after the value
    }
  }

  private determineIndexInArrayNode(currentNode: CstNodeArray, currentPath: Path): number {
    const nextKey = currentPath[0];
    const childNode = currentNode.children[nextKey as number];
    if (childNode) {
      return this.determineIndexStep(childNode, currentPath.slice(1));
    }
    // node has fewer children than the index
    return currentNode.range.start;
  }

  private determineIndexInObjectNode(currentNode: CstNodeObject, currentPath: Path): number {
    const nextKey = currentPath[0];
    for (const childNode of currentNode.children) {
      if (childNode.key == nextKey) {
        return this.determineIndexStep(childNode, currentPath.slice(1));
      }
    }
    // node not found or it has no children
    return currentNode.range.start;
  }

  determinePathFromIndex(editorContent: string, targetCharacter: number): Path {
    const cst = this.getCst(editorContent);
    return this.determinePathStep(cst.root, targetCharacter) || [];
  }

  private determinePathStep(currentNode: CstNode, targetCharacter: number): Path | undefined {
    switch (currentNode.kind) {
      case 'object':
        return this.determinePathInObject(targetCharacter, currentNode);
      case 'object-property':
        return this.determinePathInObjectProperty(targetCharacter, currentNode);
      case 'array':
        return this.determinePathInArray(targetCharacter, currentNode);
      case 'array-element':
        return this.determinePathInArrayElement(targetCharacter, currentNode);
      default:
        // for this method and all the private methods it calls:
        // undefined means that the target character is not in the current node
        return undefined;
    }
  }

  private determinePathInObject(targetCharacter: number, currentNode: CstNodeObject) {
    if (!this.isIndexInNodeRange(targetCharacter, currentNode)) {
      return undefined;
    }
    for (const childNode of currentNode.children) {
      const childPath = this.determinePathStep(childNode, targetCharacter);
      if (childPath !== undefined) {
        return childPath;
      }
    }
    return [];
  }

  private determinePathInObjectProperty(
    targetCharacter: number,
    currentNode: CstNodeObjectProperty
  ) {
    if (!this.isIndexInNodeRange(targetCharacter, currentNode)) {
      return undefined;
    }
    const childPath = this.determinePathStep(currentNode.valueNode, targetCharacter);
    let resultPath: Path = [currentNode.key];
    if (childPath !== undefined) {
      resultPath = resultPath.concat(childPath);
    }
    return resultPath;
  }

  private determinePathInArray(targetCharacter: number, currentNode: CstNodeArray) {
    if (!this.isIndexInNodeRange(targetCharacter, currentNode)) {
      return undefined;
    }
    let index = 0;
    for (const childNode of currentNode.children) {
      const childPath = this.determinePathStep(childNode, targetCharacter);
      if (childPath !== undefined) {
        const resultPath: Path = [index];
        return resultPath.concat(childPath);
      }
      index++;
    }
    return [];
  }

  private isIndexInNodeRange(targetCharacter: number, currentNode: CstNode) {
    return targetCharacter >= currentNode.range.start && targetCharacter < currentNode.range.end;
  }

  private determinePathInArrayElement(targetCharacter: number, currentNode: CstNodeArrayElement) {
    if (!this.isIndexInNodeRange(targetCharacter, currentNode)) {
      return undefined;
    }
    const childPath = this.determinePathStep(currentNode.valueNode, targetCharacter);
    return childPath ?? [];
  }

  // performance optimization to avoid multiple calls to determineIndexOfPath
  determineIndexesOfPaths(editorContent: string, paths: Path[]): {[pathKey: string]: number} {
    if (editorContent.length === 0) {
      return {};
    }
    try {
      const cst = this.getCst(editorContent);
      const result = {};
      // transform paths into a set of path keys for faster lookup
      const pathSet = new Set<string>();
      for (const path of paths) {
        pathSet.add(pathToJsonPointer(path));
      }
      this.traverseCstForIndexesForPaths(cst.root, pathSet, [], result);
      return result;
    } catch (e) {
      errorService.onError(e);
      return {};
    }
  }

  // traverses the complete cst, always keeping track of the current path. When having a match with one of the requested paths, the index is stored in the result object.
  // only ends when end of cst is reached or all paths have been found
  private traverseCstForIndexesForPaths(
    currentNode: CstNode,
    paths: Set<string>,
    currentPath: Path,
    result: {[pathKey: string]: number}
  ) {
    const pathKey = pathToJsonPointer(currentPath);
    if (paths.has(pathKey) && !(pathKey in result)) {
      result[pathKey] = currentNode.range.start;
      if (Object.keys(result).length === paths.size) {
        return; // all paths found
      }
    }
    switch (currentNode.kind) {
      case 'object':
        for (const childNode of currentNode.children) {
          this.traverseCstForIndexesForPaths(
            childNode,
            paths,
            currentPath.concat([childNode.key]),
            result
          );
        }
        break;
      case 'object-property':
        this.traverseCstForIndexesForPaths(currentNode.valueNode, paths, currentPath, result);
        break;
      case 'array':
        let index = 0;
        for (const childNode of currentNode.children) {
          this.traverseCstForIndexesForPaths(childNode, paths, currentPath.concat([index]), result);
          index++;
        }
        break;
      case 'array-element':
        this.traverseCstForIndexesForPaths(currentNode.valueNode, paths, currentPath, result);
        break;
      default:
        // do nothing for primitive nodes
        break;
    }
  }
}
