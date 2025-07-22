import {CsvImportColumnMappingData} from '@/components/toolbar/dialogs/csvimport/csvImportTypes';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {jsonPointerToPathTyped, pathToJsonPointer} from '@/utility/pathUtils';
import {lookupValuesInCsv} from '@/components/toolbar/dialogs/csvimport/importCsvUtils';

export function writeCsvToData(csv: any[], columnMapping: CsvImportColumnMappingData[]) {
  const currentData = getDataForMode(SessionMode.DataEditor);

  let rowIndexOffset = 0;
  const arrayPath = columnMapping[0].getTablePathForJsonDocument();
  // if there already exists an array at the path, append the new data to it, by setting the rowIndexOffset
  const dataAtPath = currentData.dataAt(arrayPath);
  if (Array.isArray(dataAtPath)) {
    rowIndexOffset = dataAtPath.length;
  }

  // loop through csv with row and index
  csv.forEach((row, rowIndex) => {
    // loop through columnMapping
    columnMapping.forEach(column => {
      // get the mapping for the current row
      const path = column.getPathForJsonDocument(rowIndex + rowIndexOffset);
      // set the value in the data
      currentData.setDataAt(path, row[column.name]);
    });
  });
}

export function expandCsvDataIntoTable(
  lookupCsv: any[],
  foreignKeyAttribute: string,
  primaryKeyColumn: string,
  columnMapping: CsvImportColumnMappingData[]
) {
  const currentData = getDataForMode(SessionMode.DataEditor);

  const arrayPath = columnMapping[0].getTablePathForJsonDocument();
  const arrayData: any[] = currentData.dataAt(arrayPath);
  for (let arrayIndex = 0; arrayIndex < arrayData.length; arrayIndex++) {
    const arrayElement = arrayData[arrayIndex];
    const primaryKeyValue = arrayElement[foreignKeyAttribute];
    const matchingLookupRow = lookupValuesInCsv(lookupCsv, primaryKeyColumn, primaryKeyValue);

    if (matchingLookupRow) {
      const pathToExpandRowInto = [...arrayPath, arrayIndex, foreignKeyAttribute];
      const pathToExpandRowIntoJsonPointer = pathToJsonPointer(pathToExpandRowInto);
      // insert empty object into the path
      currentData.setDataAt(pathToExpandRowInto, {});
      // now fill the object with the data from the lookup row
      columnMapping.forEach(column => {
        const pathToInsert = jsonPointerToPathTyped(
          pathToExpandRowIntoJsonPointer + '/' + column.pathAfterRowIndex
        );
        currentData.setDataAt(pathToInsert, matchingLookupRow[column.name]);
      });
    }
  }
}
