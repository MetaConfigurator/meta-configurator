import type {Path} from '@/model/path';
import {ConfigManipulatorJson} from '@/components/code-editor/ConfigManipulatorJson';
import {ConfigManipulatorYaml} from '@/components/code-editor/ConfigManipulatorYaml';

/**
 * Interface for classes that can manipulate configuration files.
 * Needs to be implemented for every data format that the tool should support.
 */
export interface ConfigManipulator {
  determineCursorPosition(editorContent: string, currentPath: Path): number;
  determinePath(editorContent: string, targetCharacter: number): Path;

  parseFileContent(editorContent: string): any;
  stringifyContentObject(content: any): string;

  isValidSyntax(editorContent: string): boolean;
}

/**
 * Creates a ConfigManipulator for the given data format.
 * @param dataFormat the data format, currently 'json' or 'yaml' are supported
 */
export function createConfigManipulator(dataFormat: string): ConfigManipulator {
  if (dataFormat == 'json') {
    return new ConfigManipulatorJson();
  } else if (dataFormat == 'yaml') {
    return new ConfigManipulatorYaml();
  }
  throw new Error('Unknown data format: ' + dataFormat);
}
