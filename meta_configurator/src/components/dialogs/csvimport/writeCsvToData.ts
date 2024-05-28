import {CsvImportColumnMappingData} from '@/components/dialogs/csvimport/csvImportTypes';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';

export function writeCsvToData(csv: any[], columnMapping: CsvImportColumnMappingData[]) {
  const currentData = getDataForMode(SessionMode.DataEditor);

  // loop through csv with row and index
  csv.forEach((row, rowIndex) => {
    // loop through columnMapping
    columnMapping.forEach(column => {
      // get the mapping for the current row
      const path = column.getPathForJsonDocument(rowIndex);
      // set the value in the data
      currentData.setDataAt(path, row[column.name]);
    });
  });
}
