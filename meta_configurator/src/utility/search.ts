import type {Path} from '@/model/path';
import {useSessionStore} from '@/store/sessionStore';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {errorService} from '@/main';
import type {MenuItem} from 'primevue/menuitem';
import {pathToString} from '@/utility/pathUtils';
import {dataToString} from '@/utility/dataToString';
import _ from 'lodash';
import {MAX_SEARCH_DEPTH} from '@/constants';
import {useCurrentData, useCurrentSchema} from '@/data/useDataLink';

/**
 * Searches for the given search term in the data and schema.
 * This will consider the title and description of the schema and all properties.
 *
 * @param searchTerm The term to search for.
 * @returns An array of search results.
 */
export async function searchInDataAndSchema(searchTerm: string): Promise<SearchResult[]> {
  try {
    const result: SearchResult[] = [];
    const data = useCurrentData().data.value;
    const schema: JsonSchemaWrapper = useCurrentSchema().schemaWrapper.value;
    await searchInDataAndSchemaRecursive(data, schema, [], searchTerm, result);
    return result;
  } catch (e) {
    errorService.onError(e);
    return [];
  }
}

async function searchInDataAndSchemaRecursive(
  data: any | undefined,
  schema: JsonSchemaWrapper | undefined,
  path: Path,
  searchTerm: string,
  result: SearchResult[],
  depth = 0
): Promise<void> {
  if (depth > MAX_SEARCH_DEPTH) {
    return; // prevent potential infinite recursion in circular schemas
  }

  if (isPrimitive(data)) {
    if (matchesSearchTerm(data.toString(), searchTerm)) {
      addToResult(path, data, schema, searchTerm, result);
    }
  }

  // also consider the title and description of the schema
  if (descriptionOrTitleMatches(schema, searchTerm)) {
    addToResult(path, data, schema, searchTerm, result);
  }

  // search in array items
  if (data && Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      await searchInDataAndSchemaRecursive(
        data[i],
        schema?.subSchema(i),
        [...path, i],
        searchTerm,
        result,
        depth + 1
      );
    }
  }

  // search in object properties
  if (isObject(data)) {
    const propertyNames = getPropertyNamesFromDataAndSchema(data, schema);
    for (const propertyName of propertyNames) {
      await searchInDataAndSchemaRecursive(
        data !== undefined ? data[propertyName] : undefined,
        schema?.subSchema(propertyName),
        [...path, propertyName],
        searchTerm,
        result,
        depth + 1
      );
      if (matchesSearchTerm(propertyName, searchTerm)) {
        addToResult(
          [...path, propertyName],
          data?.[propertyName],
          schema?.subSchema(propertyName),
          searchTerm,
          result
        );
      }
    }
  }
}

function addToResult(
  path: Path,
  data: any | undefined,
  schema: JsonSchemaWrapper | undefined,
  searchTerm: string,
  result: SearchResult[]
): void {
  // check that the result wasn't found yet
  if (!result.some(r => _.isEqual(r.path, path))) {
    result.push({
      path,
      data,
      schema,
      searchTerm,
    });
  }
}

function getPropertyNamesFromDataAndSchema(data: any, schema: JsonSchemaWrapper | undefined) {
  return new Set(Object.keys(data ?? {}).concat(Object.keys(schema?.properties ?? {})));
}

function descriptionOrTitleMatches(schema: JsonSchemaWrapper | undefined, searchTerm: string) {
  return (
    (schema?.title !== undefined && matchesSearchTerm(schema.title, searchTerm)) ||
    (schema?.description !== undefined && matchesSearchTerm(schema.description, searchTerm))
  );
}

function matchesSearchTerm(dataString: string, searchTerm: string): boolean {
  return dataString.toLowerCase().includes(searchTerm.toLowerCase());
}

function isPrimitive(data: any) {
  return (
    data !== undefined &&
    (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean')
  );
}

function isObject(data: any) {
  return data === undefined || (typeof data === 'object' && !Array.isArray(data));
}

export interface SearchResult {
  path: Path;
  data: any | undefined;
  schema: JsonSchemaWrapper | undefined;
  searchTerm: string;
}

/**
 * Converts a search result to a menu item that can be used in the search results menu.
 */
export function searchResultToMenuItem(searchResult: SearchResult): MenuItem {
  const pathString = pathToString(searchResult.path);
  return {
    label: dataToString(pathString || searchResult.schema?.title || 'Root', 0, 35),
    data: dataToString(searchResult.data, 1, 80) ?? '',
    command: () => {
      useSessionStore().currentSelectedElement = searchResult.path;
    },
  };
}
