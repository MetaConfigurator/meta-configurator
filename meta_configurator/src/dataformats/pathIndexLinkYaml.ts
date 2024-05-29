import type {PathIndexLink} from '@/dataformats/pathIndexLink';
import type {Path} from '@/utility/path';

import {errorService} from '@/main';
import {type Node, Document, parseDocument, visit, YAMLSeq} from 'yaml';

/**
 * Implementation of PathIndexLink for YAML data.
 */
export class PathIndexLinkYaml implements PathIndexLink {
  // cache the cst and the editor content to avoid parsing the same content multiple times
  private _yamlDocument: Document | null = null;
  private _editorContent: string | null = null;

  determineIndexOfPath(editorContent: string, currentPath: Path): number {
    if (editorContent.length === 0) {
      return 0;
    }
    try {
      const document = this.getYamlDocument(editorContent);
      const node: any = document.getIn(currentPath, true);
      if (node && node.range) {
        return node.range[0];
      }
    } catch (e) {
      errorService.onError(e);
    }
    return 0;
  }

  private getYamlDocument(editorContent: string): Document {
    if (this._editorContent !== editorContent || this._yamlDocument === null) {
      this._yamlDocument = parseDocument(editorContent);
      this._editorContent = editorContent;
    }
    return this._yamlDocument;
  }

  determinePathFromIndex(editorContent: string, targetCharacter: number): Path {
    const document = this.getYamlDocument(editorContent);
    if (!document.contents) {
      return [];
    }

    let result: Path = [];

    visit(document, {
      Pair(_, pair) {
        const pairKey: Node | null = pair.key;
        const pairValue: Node | null = pair.value;
        if (pairKey && pairValue) {
          if (
            (pairKey.range &&
              pairKey.range[0] <= targetCharacter &&
              targetCharacter <= pairKey.range[1]) ||
            (pairValue.range &&
              pairValue.range[0] <= targetCharacter &&
              targetCharacter <= pairValue.range[1])
          ) {
            const pairKeyAny: any = pairKey;
            result.push(pairKeyAny.value);
          }
        }
      },
      Seq: (key, seq: YAMLSeq) => {
        seq.items.forEach((item, index) => {
          const itemNode: Node = item;
          if (
            itemNode &&
            itemNode.range &&
            itemNode.range[0] <= targetCharacter &&
            targetCharacter <= itemNode.range[1]
          ) {
            result.push(index);
          }
        });
      },
    });
    return result;
  }
}
