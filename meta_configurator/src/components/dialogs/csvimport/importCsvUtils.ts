import {useFileDialog} from '@vueuse/core';
import {readFileContentToRef} from '@/utility/readFileContent';
import type {Ref} from 'vue';
import {getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {dataPathToSchemaPath, pathToString} from '@/utility/pathUtils';
import _ from 'lodash';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {mergeAllOfs} from '@/schema/mergeAllOfs';
import type {Path, PathElement} from '@/utility/path';
import type {CsvImportColumnMappingData} from '@/components/dialogs/csvimport/csvImportTypes';
import {
  type LabelledValue,
  replaceDecimalSeparator,
} from '@/components/dialogs/csvimport/delimiterSeparatorUtils';
import {type CsvError, parse} from 'csv-parse/browser/esm';

export function requestUploadFileToRef(resultString: Ref<string>, resultTableName: Ref<string>) {
  const {open, onChange} = useFileDialog();

  onChange((files: FileList | null) => {
    if (files && files.length > 0) {
      resultTableName.value = userStringToIdentifier(files[0].name, true); // Get the name of the first file
      readFileContentToRef(files, resultString);
    }
  });
  open();
}

export function inferSchemaForNewDataAndMergeIntoCurrentSchema(
  newData: any,
  newDataPath: Path,
  currentColumnMapping: CsvImportColumnMappingData[]
) {
  // we want to obtain an object which contains only the new data, in its proper path
  const dataWithOnlyNew = _.set({}, pathToString(newDataPath), newData);

  const inferredSchema = inferJsonSchema(dataWithOnlyNew);
  if (inferredSchema) {
    for (const column of currentColumnMapping) {
      addCustomTitleToSchemaProperty(inferredSchema, column);
    }

    const schema = getSchemaForMode(SessionMode.DataEditor);
    const currentSchema = schema.schemaRaw.value;
    // then we merge the new schema into the current one
    getSchemaForMode(SessionMode.DataEditor).schemaRaw.value = mergeAllOfs({
      allOf: [currentSchema, inferredSchema],
    });
  }
}

function addCustomTitleToSchemaProperty(inferredSchema: any, column: CsvImportColumnMappingData) {
  const propertySchemaTitlePath = [
    ...dataPathToSchemaPath(column.getPathForJsonDocument(0)),
    'title',
  ];
  const titlePathString = pathToString(propertySchemaTitlePath);
  _.set(inferredSchema, titlePathString, column.titleInSchema);
}

export function loadCsvFromUserString(
  currentUserDataString: Ref<string>,
  currentUserCsv: Ref<any[]>,
  delimiter: string,
  decimalSeparator: string,
  errorMessage: Ref<string>
) {
  if (currentUserDataString.value.length > 0) {
    let inputString = currentUserDataString.value;
    if (decimalSeparator !== '.') {
      inputString = replaceDecimalSeparator(inputString, delimiter, decimalSeparator, '.');
    }

    parse(
      inputString,
      {
        delimiter: delimiter,
        columns: true,
        skip_empty_lines: true,
        cast: true,
        trim: true,
      },
      (error: CsvError | undefined, records: any) => {
        if (error) {
          errorMessage.value =
            'With the given delimiter and decimal separator, the CSV could not be parsed. ' +
            '\nPlease check the settings. ' +
            '\nError: ' +
            error.message;
          currentUserCsv.value = [];
        } else {
          errorMessage.value = '';
          currentUserCsv.value = records;
        }
      }
    );
  } else {
    currentUserCsv.value = [];
  }
}

export const delimiterOptions: LabelledValue[] = [
  {
    label: ',',
    value: ',',
  },
  {
    label: ';',
    value: ';',
  },
  {
    label: 'Tab',
    value: '\t',
  },
  {
    label: 'Space',
    value: ' ',
  },
  {
    label: '|',
    value: '|',
  },
];

export const decimalSeparatorOptions: LabelledValue[] = [
  {
    label: '.',
    value: '.',
  },
  {
    label: ',',
    value: ',',
  },
];

export function userStringToIdentifier(input: string, cutExtension: boolean = false): string {
  if (cutExtension) {
    input = input.replace(/\.[^/.]+$/, '');
  }

  // remove special characters, trim whitespaces outside and replace whitespaces inside with underscores. Also transform to lower case.
  return input
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s/g, '_')
    .toLowerCase();
}

// note that this function does not look for a table within a table
export function detectPossibleTablesInJson(json: any, path: Path = []): Path[] {
  const tables: Path[] = [];
  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      const newPath = path ? [...path, key] : [key];
      if (Array.isArray(json[key])) {
        tables.push(newPath);
      } else if (typeof json[key] === 'object' && json[key] !== null) {
        tables.push(...detectPossibleTablesInJson(json[key], newPath));
      }
    }
  }
  return tables;
}

export function detectPropertiesOfTableInJson(json: any, tablePath: Path): string[] {
  const table = _.get(json, pathToString(tablePath));
  if (Array.isArray(table)) {
    if (table.length > 0) {
      return Object.keys(table[0]);
    }
  }
  return [];
}
