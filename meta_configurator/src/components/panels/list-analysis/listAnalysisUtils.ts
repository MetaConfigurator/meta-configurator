import _ from 'lodash';
import {dataAt} from '@/utility/resolveDataAtPath';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';

export function createItemsRowsObjectsFromJson(itemsJson: any): {
  rows: any[];
  columnNames: string[];
} {
  const columnNames = collectItemColumnNames(itemsJson);

  const rows = itemsJson.map((itemJson: any) => {
    return createItemRow(itemJson, columnNames);
  });

  const columnNamesFormatted: string[] = Array.from(columnNames).map((columnName: string) => {
    return formatJsonPointerForUser(columnName);
  });

  return {rows: rows, columnNames: columnNamesFormatted};
}

export function createItemRow(itemJson: any, columnNames: Set<string>): any {
  const row: any = {};

  for (const columnName of columnNames) {
    const columnData = dataAt(jsonPointerToPathTyped(columnName), itemJson);

    const formattedColumnName = formatJsonPointerAsPropertyName(columnName);
    if (columnData !== undefined) {
      row[formattedColumnName] = columnData;
    } else {
      row[formattedColumnName] = null;
    }
  }

  return row;
}

export function createItemRowsArraysFromObjects(itemsRowsObjects: any[]): any[][] {
  const columnNames = Object.keys(itemsRowsObjects[0]);

  return itemsRowsObjects.map((itemRow: any) => {
    return createItemRowArray(itemRow, columnNames);
  });
}

function createItemRowArray(itemRow: any, columnNames: string[]): any[] {
  return columnNames.map((columnName: string) => {
    return itemRow[columnName];
  });
}

// collect all properties of the items, including nested properties
function collectItemColumnNames(itemsJson: any): Set<string> {
  const columnNames: Set<string> = new Set();

  for (const itemJson of itemsJson) {
    for (const itemProperty in itemJson) {
      if (itemJson.hasOwnProperty(itemProperty)) {
        // if it is an object: recursively collect all nested properties
        if (_.isObject(itemJson[itemProperty])) {
          const nestedColumnNames = collectItemColumnNames([itemJson[itemProperty]]);
          nestedColumnNames.forEach((nestedColumnName: string) => {
            columnNames.add(`/${itemProperty}${nestedColumnName}`);
          });
        } else {
          // if it is a simple property: add it to the list
          if (itemProperty !== undefined) {
            columnNames.add('/' + itemProperty);
          }
        }
      }
    }
  }

  return columnNames;
}

export function formatJsonPointerAsPropertyName(pointer: string): string {
  // remove first slash and replace others by dot
  return pointer.replaceAll('/', '');
}

export function formatJsonPointerForUser(pointer: string): string {
  // remove first slash and replace others by dot
  return pointer.substring(1).replaceAll('/', '.');
}

export function convertToCSV(data: (string | number | boolean | null | undefined)[][]): string {
  return data
    .map(row =>
      row
        .map(value => {
          if (value === null || value === undefined) return ''; // Convert null/undefined to empty string
          const strValue = String(value); // Convert any value to string
          // Ensure values containing commas, quotes, or newlines are escaped
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`; // Escape double quotes by doubling them
          }
          return strValue;
        })
        .join(',')
    )
    .join('\n');
}
