import type {PathIndexLink} from '@/dataformats/pathIndexLink';
import type {Path} from '@/utility/path';

import {errorService} from '@/main';
import {arePathsEqual} from "@/utility/pathUtils";

/**
 * Implementation of PathIndexLink for XML data.
 */
export class PathIndexLinkXml implements PathIndexLink {
  // cache the cst and the editor content to avoid parsing the same content multiple times
  private _cst: any | null = null;
  private _editorContent: string | null = null;


  private getCst(editorContent: string): Document {
    if (this._editorContent !== editorContent || this._cst === null) {
      this._cst = this.buildCST(editorContent);
      this._editorContent = editorContent;
    }
    return this._cst;
  }

  determineIndexOfPath(editorContent: string, currentPath: Path): number {
    if (editorContent.length === 0) {
      return 0;
    }
    try {
      const cst = this.getCst(editorContent);
      return this.findPositionFromPath(cst, currentPath) || 0;


    } catch (e) {
      errorService.onError(e);
    }
    return 0;
  }


  determinePathFromIndex(editorContent: string, targetCharacter: number): Path {
    if (editorContent.length === 0) {
      return [];
    }
    try {
      const cst = this.getCst(editorContent);
      return this.findPathFromPosition(cst, targetCharacter) || [];
    } catch (e) {
      errorService.onError(e);
    }
    return [];
  }


  findPathFromPosition(cst: any, position: number, path: Path = []): Path | null {
    for (const node of cst.children) {
      if (position >= node.start && position <= node.end) {
        if (node.type === "Element") path.push(node.name);
        return this.findPathFromPosition(node, position, path) || path;
      }
    }
    return null;
  }

  findPositionFromPath(cst: any, targetPath: Path, path: Path = []): number | null {
    for (const node of cst.children) {
      if (node.type === "Element") path.push(node.name);
      if (arePathsEqual(path, targetPath)) {
        return node.start;
      }
      const pos = this.findPositionFromPath(node, targetPath, path);
      if (pos !== null) return pos;
      path.pop();
    }
    return null;
  }


  buildCST(xmlText: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    function traverse(node: Element | ChildNode, startIndex: number): any {
      if (node.nodeType === Node.TEXT_NODE) {
        return {
          type: "Text",
          value: node.nodeValue?.trim(),
          start: startIndex,
          end: startIndex + (node.nodeValue?.length || 0),
        };
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = (node as Element).tagName;
        const tagStart = xmlText.indexOf(`<${tagName}`, startIndex);
        const tagEnd = xmlText.indexOf(`>`, tagStart) + 1;

        let closingTagStart = xmlText.lastIndexOf(`</${tagName}>`);
        if (closingTagStart === -1) closingTagStart = xmlText.length;

        let children: any[] = [];
        let childIndex = tagEnd;

        node.childNodes.forEach((child) => {
          const childNode = traverse(child, childIndex);
          if (childNode) {
            children.push(childNode);
            childIndex = childNode.end;
          }
        });

        return {
          type: "Element",
          name: tagName,
          start: tagStart,
          end: closingTagStart + tagName.length + 3, // "</tag>" length
          children,
        };
      }

      return null;
    }

    return {
      type: "Document",
      children: Array.from(xmlDoc.childNodes).map((node) => traverse(node, 0)),
    };
  }

}
