import {ref, type Ref} from 'vue';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';
import {stringToIdentifier} from '@/utility/stringToIdentifier';

export class CsvImportColumnMappingData {
  constructor(public index: number, public name: string, pathBeforeRowIndex: Ref<string>) {
    this.pathBeforeRowIndex = pathBeforeRowIndex;
    this.pathAfterRowIndex = ref(stringToIdentifier(this.name, false));
    this.titleInSchema = ref(this.name);
  }

  public pathBeforeRowIndex: Ref<string>;
  public pathAfterRowIndex: Ref<string>;
  public titleInSchema: Ref<string>;

  public getPathForJsonDocument(rowIndex: number): Path {
    return jsonPointerToPathTyped(
      '/' + this.pathBeforeRowIndex + '/' + rowIndex + '/' + this.pathAfterRowIndex
    );
  }

  public getTablePathForJsonDocument(): Path {
    return jsonPointerToPathTyped('/' + this.pathBeforeRowIndex);
  }
}
