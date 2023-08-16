import type {Path} from '@/model/path';
import type {ConfigManipulator} from '@/model/ConfigManipulator';
import YAML from 'yaml';

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
}