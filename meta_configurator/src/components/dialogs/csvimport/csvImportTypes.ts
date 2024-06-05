import {ref, type Ref} from 'vue';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';

export class CsvImportColumnMappingData {
  constructor(public index: number, public name: string, pathBeforeRowIndex: Ref<string>) {
    this.pathBeforeRowIndex = pathBeforeRowIndex;
    this.pathAfterRowIndex = ref(columnNameToElementId(this.name));
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
}

function columnNameToElementId(columnName: string): string {
  // remove special characters, trim whitespaces outside and replace whitespaces inside with underscores. Also transform to lower case.
  return columnName
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s/g, '_')
    .toLowerCase();
}
