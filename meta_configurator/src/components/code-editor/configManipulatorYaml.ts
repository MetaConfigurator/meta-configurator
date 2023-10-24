import type {Path} from '@/model/path';
import type {ConfigManipulator} from '@/components/code-editor/configManipulator';
import YAML from 'yaml';

/**
 * ConfigManipulator implementation for the YAML data format.
 */
export class ConfigManipulatorYaml implements ConfigManipulator {
  constructor() {}

  parseFileContent(editorContent: string): any {
    return YAML.parse(editorContent);
  }

  stringifyContentObject(content: any): string {
    return YAML.stringify(content);
  }
  determineCursorPosition(editorContent: string, currentPath: Path): number {
    return 0;
    // TODO
  }

  determinePath(editorContent: string, targetCharacter: number): Path {
    return ['TODO'];
  }

  isValidSyntax(editorContent: string): boolean {
    try {
      this.parseFileContent(editorContent);
      return true;
    } catch (e) {
      return false;
    }
  }
}
