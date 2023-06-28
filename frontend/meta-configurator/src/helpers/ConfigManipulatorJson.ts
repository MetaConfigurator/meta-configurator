import {JsonSchema} from '@/model/JsonSchema';
import type {ConfigTreeNode} from '@/model/ConfigTreeNode';
import type {Path, PathElement} from '@/model/path';
import type {ConfigManipulator} from "@/helpers/ConfigManipulator";
import type {Position} from "brace";
import type {CstDocument, CstNode, TokenWithOffset, CstKindObjectProperty, CstValueNode, CstNodeObjectProperty } from 'json-cst'
import {parse} from 'json-cst'
import type {WhitespaceToken} from "json-lexer";


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

    let rowsLeftToTraverse = cursorPosition.row;
    let columnsLeftToTraverse = cursorPosition.column;

    let cst: CstDocument = parse(editorContent);
    rowsLeftToTraverse -= this.countNewlines(cst.whitespaceBefore);


    console.log(cst)
    return this.determinePathNew(rowsLeftToTraverse, columnsLeftToTraverse, cst.root);
  }

  private countNewlines(whitespaces: TokenWithOffset< WhitespaceToken > | undefined): number {
    if (whitespaces === undefined) {
      return 0;
    }
    return (whitespaces.value.match("/n/g") || []).length;
  }

  private countSpaces(whitespaces: TokenWithOffset< WhitespaceToken > | undefined): number {
    if (whitespaces === undefined) {
      return 0;
    }
    return (whitespaces.value.match("/s/g") || []).length - this.countNewlines(whitespaces);
  }

  private determinePathNew(rowsLeftToTraverse: number, columnsLeftToTraverse: number, currentNode : CstNode): Path {
    if (currentNode.kind == "object-property-colon") {
      rowsLeftToTraverse -= this.countNewlines(currentNode.whitespaceBefore);
    }
    if (currentNode.kind == "object-property") {
      rowsLeftToTraverse -= this.countNewlines(currentNode.whitespaceBefore);
    }
    if (currentNode.kind == "array-element") {
      rowsLeftToTraverse -= this.countNewlines(currentNode.whitespaceBefore);
    }

    if (rowsLeftToTraverse <= 0 ) {
      if (currentNode.kind == "object-property") {
        return [currentNode.key]
      } else {
        return []
      }
    } else {


      if (currentNode.kind == "object-property-colon") {
        rowsLeftToTraverse -= this.countNewlines(currentNode.whitespaceAfter);
      }

      if (currentNode.kind == "object") {

        for(let child of currentNode.children) {
          child.

        }
        return this.determinePathNew(rowsLeftToTraverse, columnsLeftToTraverse, cst.root);

      }

    }

  }
}
