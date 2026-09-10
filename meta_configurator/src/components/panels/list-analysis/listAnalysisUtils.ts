import _ from 'lodash';
import {dataAt} from '@/utility/resolveDataAtPath';
import type {Path} from '@/utility/path';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';

export interface TableColumnDefinition {
  pointer: string;
  field: string;
  label: string;
  path: Path;
}

export function createItemsRowsObjectsFromJson(itemsJson: any): {
  rows: any[];
  columns: TableColumnDefinition[];
} {
  const columnPointers = collectItemColumnNames(itemsJson);
  const columns: TableColumnDefinition[] = Array.from(columnPointers).map(columnPointer => ({
    pointer: columnPointer,
    field: formatJsonPointerAsPropertyName(columnPointer),
    label: formatJsonPointerForUser(columnPointer),
    path: jsonPointerToPathTyped(columnPointer),
  }));

  const rows = itemsJson.map((itemJson: any, index: number) => {
    return createItemRow(itemJson, columns, index);
  });

  return {rows: rows, columns};
}

export function createItemRow(
  itemJson: any,
  columns: TableColumnDefinition[],
  rowIndex: number
): any {
  const row: any = {};

  for (const column of columns) {
    const columnData = dataAt(column.path, itemJson);
    row[column.field] = columnData ?? null;
  }

  row.__originalIndex = rowIndex;

  return row;
}

export function createItemRowsArraysFromObjects(itemsRowsObjects: any[]): any[][] {
  const columnNames = Object.keys(itemsRowsObjects[0]).filter(
    columnName => columnName !== '__originalIndex'
  );

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
