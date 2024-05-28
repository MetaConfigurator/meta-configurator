import {ref, type Ref} from 'vue';
import {jsonPointerToPath} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';

export class CsvImportColumnMappingData {
  constructor(public index: number, public name: string, pathBeforeRowIndex: Ref<string>) {
    this.pathBeforeRowIndex = pathBeforeRowIndex;
    this.pathAfterRowIndex = ref(this.name);
  }

  public pathBeforeRowIndex: Ref<string>;
  public pathAfterRowIndex: Ref<string>;

  public getPathForJsonDocument(rowIndex: number): Path {
    return jsonPointerToPath(
      '/' + this.pathBeforeRowIndex + '/' + rowIndex + '/' + this.pathAfterRowIndex
    );
  }
}
