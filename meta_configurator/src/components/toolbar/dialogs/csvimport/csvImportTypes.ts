import {type Ref, unref} from 'vue';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';
import {stringToIdentifier} from '@/utility/stringToIdentifier';

export class CsvImportColumnMappingData {
  constructor(public index: number, public name: string, pathBeforeRowIndex: Ref<string>) {
    this.pathBeforeRowIndex = pathBeforeRowIndex;
    this.pathAfterRowIndex = stringToIdentifier(this.name, false);
    this.titleInSchema = this.name;
  }

  public pathBeforeRowIndex: Ref<string>;
  public pathAfterRowIndex: string;
  public titleInSchema: string;

  public getPathForJsonDocument(rowIndex: number): Path {
    return jsonPointerToPathTyped(
      '/' + unref(this.pathBeforeRowIndex) + '/' + rowIndex + '/' + this.pathAfterRowIndex
    );
  }

  public getTablePathForJsonDocument(): Path {
    return jsonPointerToPathTyped('/' + unref(this.pathBeforeRowIndex));
  }
}
