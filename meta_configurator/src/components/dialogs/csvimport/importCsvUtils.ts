import {useFileDialog} from '@vueuse/core';
import {readFileContentToStringRef} from '@/utility/readFileContent';
import type {Ref} from 'vue';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {dataPathToSchemaPath, pathToString} from '@/utility/pathUtils';
import _ from 'lodash';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {mergeAllOfs} from '@/schema/mergeAllOfs';
import type {Path} from '@/utility/path';
import type {CsvImportColumnMappingData} from '@/components/dialogs/csvimport/csvImportTypes';
import {
  type LabelledValue,
  replaceDecimalSeparator,
} from '@/components/dialogs/csvimport/delimiterSeparatorUtils';
import {type CsvError, parse} from 'csv-parse/browser/esm';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';
import {identifyArraysInJson} from '@/utility/arrayPathUtils';
import {stringToIdentifier} from '@/utility/stringToIdentifier';

export function requestUploadFileToRef(resultString: Ref<string>, resultTableName: Ref<string>) {
  const {open, onChange, reset} = useFileDialog({
    // accept only json, schema.json, yaml, yml, xml and xsd files
    accept: '.csv',
    multiple: false,
  });

  onChange((files: FileList | null) => {
    if (files && files.length > 0) {
      resultTableName.value = stringToIdentifier(files[0].name, true); // Get the name of the first file
      readFileContentToStringRef(files, resultString);
    }
    reset(); // Reset the file dialog after selection
  });

  // opening it with a small delay might fix the issue of the dialog opening but onChange never triggering
  setTimeout(() => {
    open();
  }, 3);
}

export function inferSchemaForNewDataAndMergeIntoCurrentSchema(
  newData: any,
  newDataPath: Path,
  currentColumnMapping: CsvImportColumnMappingData[]
) {
  // we want to obtain an object which contains only the new data, in its proper path
  const dataWithOnlyNew = _.set({}, pathToString(newDataPath), newData);

  const inferredSchema = inferJsonSchema(dataWithOnlyNew);
  if (!inferredSchema) {
    throw Error('Unable to infer schema for the given data.');
  }
  //for (const column of currentColumnMapping) {
  //  addCustomTitleToSchemaProperty(inferredSchema, column);
  //}

  const schema = getSchemaForMode(SessionMode.DataEditor);
  const currentSchema = schema.schemaRaw.value;
  // then we merge the new schema into the current one
  getSchemaForMode(SessionMode.DataEditor).schemaRaw.value = mergeAllOfs({
    allOf: [currentSchema, inferredSchema],
  });
}

// temporarily removed to reduce complexity for the user
/*function addCustomTitleToSchemaProperty(inferredSchema: any, column: CsvImportColumnMappingData) {
  const propertySchemaTitlePath = [
    ...dataPathToSchemaPath(column.getPathForJsonDocument(0)),
    'title',
  ];
  const titlePathString = pathToString(propertySchemaTitlePath);
  _.set(inferredSchema, titlePathString, column.titleInSchema);
}*/

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

// note that this function does not look for a table within a table
export function detectPossibleTablesInJson(json: any, path: Path = []): Path[] {
  return identifyArraysInJson(json, path, false, true);
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

export function findBestMatchingForeignKeyAttribute(
  arrayPath: Path,
  lookupCsv: any[],
  foreignKeyAttributeChoices: string[],
  primaryKeyColumn: string
) {
  const currentData = getDataForMode(SessionMode.DataEditor);
  const arrayData: any[] = currentData.dataAt(arrayPath);

  const matchingCounts = foreignKeyAttributeChoices.map(foreignKeyAttribute => {
    return countKeyMatches(arrayData, lookupCsv, foreignKeyAttribute, primaryKeyColumn);
  });
  const maxCount = Math.max(...matchingCounts);
  const bestMatchingIndex = matchingCounts.indexOf(maxCount);
  return foreignKeyAttributeChoices[bestMatchingIndex];
}

function countKeyMatches(
  arrayData: any[],
  lookupCsv: any[],
  foreignKeyAttribute: string,
  primaryKeyColumn: string,
  maxElementsToCheck: number = 100
) {
  let result = 0;
  for (
    let arrayIndex = 0;
    arrayIndex < Math.min(arrayData.length, maxElementsToCheck + 1);
    arrayIndex++
  ) {
    const arrayElement = arrayData[arrayIndex];
    const primaryKeyValue = arrayElement[foreignKeyAttribute];
    const matchingLookupRow = lookupValuesInCsv(lookupCsv, primaryKeyColumn, primaryKeyValue);
    if (matchingLookupRow) {
      result += 1;
    }
  }
  return result;
}

export function lookupValuesInCsv(
  lookupCsv: any[],
  primaryKeyColumn: string,
  primaryKeyValue: string
) {
  return lookupCsv.find(row => row[primaryKeyColumn] === primaryKeyValue);
}

export function inferExpansionSchema(
  tableData: any,
  tablePath: Path,
  expandedProperty: string,
  currentColumnMapping: CsvImportColumnMappingData[]
) {
  const onlyTableData = _.set({}, pathToString(tablePath), tableData);
  const tableSchema: JsonSchemaType = inferJsonSchema(onlyTableData);
  if (!tableSchema) {
    throw Error('Unable to infer schema for the given data.');
  }

  const expansionPropSchemaPath = dataPathToSchemaPath([...tablePath, 0, expandedProperty]);
  const expansionPropSchema = _.get(tableSchema, pathToString(expansionPropSchemaPath));

  if (!expansionPropSchema) {
    throw Error('Unable to access expansion schema of the inferred table schema.');
  }

  // Does not yet work because the addCustomTitle function is not yet adjusted to deal with expansion properties
  //for (const column of currentColumnMapping) {
  //  addCustomTitleToSchemaProperty(expansionPropSchema, column);
  //}

  // after having inferred expansion schema by using whole table as basis, we remove the other table props from the schema
  // this way, we overwrite only the expansion property and not also the other table properties
  const objectWithOnlyExpandedProp: any = {};
  objectWithOnlyExpandedProp[expandedProperty] = expansionPropSchema;
  const tableSchemaPath = dataPathToSchemaPath(tablePath);
  _.set(
    tableSchema as any,
    pathToString([...tableSchemaPath, 'items', 'properties']),
    objectWithOnlyExpandedProp
  );

  const schema = getSchemaForMode(SessionMode.DataEditor);
  const currentSchema = schema.schemaRaw.value;

  // in currentSchema, remove the expanded property, because it conflicts with the new schema
  _.set(
    currentSchema as any,
    pathToString([...dataPathToSchemaPath(tablePath), 'items', 'properties', expandedProperty]),
    undefined
  );

  // then we merge the new schema into the current one
  getSchemaForMode(SessionMode.DataEditor).schemaRaw.value = mergeAllOfs({
    allOf: [currentSchema, tableSchema],
  });
}
