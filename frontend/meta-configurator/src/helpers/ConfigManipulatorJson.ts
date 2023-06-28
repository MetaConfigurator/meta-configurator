import {JsonSchema} from '@/model/JsonSchema';
import type {ConfigTreeNode} from '@/model/ConfigTreeNode';
import type {Path, PathElement} from '@/model/path';
import type {ConfigManipulator} from "@/helpers/ConfigManipulator";
import { parse } from 'json-cst'
import type {Position} from "brace";


export class ConfigManipulatorJson implements ConfigManipulator {
  constructor() {
  }




  determineCursorPosition(editorContent: string, currentPath: Path): Position {
    // todo: implement


    return {
      row: 4,
      column: 0
  };
  }


  determinePath(editorContent: string, cursorPosition: Position): Path {
    // todo: implement

    let cst = parse(editorContent);
    console.log(cst)
    return ["todo"];
  }
}
