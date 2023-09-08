import type {Path, PathElement} from '@/model/path';
import type {ConfigManipulator} from '@/components/code-editor/ConfigManipulator';
import YAML from 'yaml';
import {Parser} from 'yaml';
import {errorService} from '@/main';

export class ConfigManipulatorYaml implements ConfigManipulator {
  constructor() {}

  parseFileContent(editorContent: string): any {
    return YAML.parse(editorContent);
  }

  stringifyContentObject(content: any): string {
    return YAML.stringify(content);
  }
  determineCursorPosition(editorContent: string, currentPath: Path): number {
    try {
      const document = new Parser().parse(editorContent);
      return this.determineCursorPositionStep(document, currentPath);
    } catch (e) {
      errorService.onError(e);
      return 0;
    }
  }

  determineCursorPositionStep(currentNode: any, currentPath: Path): number {
    if (!currentNode) return 0;

    if (currentPath.length === 0) {
      return currentNode.range ? currentNode.range[1] : 0;
    }

    const nextKey: PathElement = currentPath[0];

    if (currentNode.type === 'object') {
      for (const item of currentNode.items) {
        if (item.key && item.key.value === nextKey) {
          return this.determineCursorPositionStep(item.value, currentPath.slice(1));
        }
      }
    } else if (currentNode.type === 'array') {
      let index = 0;
      for (const item of currentNode.items) {
        if (index === nextKey) {
          return this.determineCursorPositionStep(item, currentPath.slice(1));
        }
        index++;
      }
    }

    return currentNode.range ? currentNode.range[0] : 0;
  }

  determinePath(editorContent: string, targetCharacter: number): Path {
    return ['TODO'];
  }
}
