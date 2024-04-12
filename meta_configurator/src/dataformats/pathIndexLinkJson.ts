import type {PathIndexLink} from '@/dataformats/pathIndexLink';
import type {Path} from '@/utility/path';
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
        return currentNode.range.end - 1; // before the closing quote
      case 'number':
      case 'literal':
      default:
        return currentNode.range.end; // after the value
    }
  }

  private determineIndexInArrayNode(currentNode: CstNodeArray, currentPath: Path): number {
    const nextKey = currentPath[0];
    const childNode = currentNode.children[nextKey as number];
    if (childNode) {
      return this.determineIndexStep(childNode, currentPath.slice(1));
    }
    // node has fewer children than the index
    return this.getPositionAfterLastChild(currentNode);
  }

  private determineIndexInObjectNode(currentNode: CstNodeObject, currentPath: Path): number {
    const nextKey = currentPath[0];
    for (const childNode of currentNode.children) {
      if (childNode.key == nextKey) {
        return this.determineIndexStep(childNode, currentPath.slice(1));
      }
    }
    // node not found or it has no children
    return this.getPositionAfterLastChild(currentNode);
  }

  private getPositionAfterLastChild(currentNode: CstNodeObject | CstNodeArray): number {
    if (currentNode.whitespaceAfterChildren) {
      return currentNode.whitespaceAfterChildren.offset;
    }
    return currentNode.range.end - 1; // before the closing brace
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
}
