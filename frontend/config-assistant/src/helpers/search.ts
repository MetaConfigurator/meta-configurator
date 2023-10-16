import type {Path} from '@/model/path';
import {useSessionStore} from '@/store/sessionStore';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {errorService} from '@/main';
import type {MenuItem} from 'primevue/menuitem';
import {pathToString} from '@/helpers/pathHelper';
import {dataToString} from '@/helpers/dataToString';
import _ from 'lodash';

const MAX_DEPTH = 250;

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
    const data = useSessionStore().fileData;
    const schema: JsonSchema = useSessionStore().fileSchema;
    await searchInDataAndSchemaRecursive(data, schema, [], searchTerm, result);
    return result;
  } catch (e) {
    errorService.onError(e);
    return [];
  }
}

async function searchInDataAndSchemaRecursive(
  data: any | undefined,
  schema: JsonSchema | undefined,
  path: Path,
  searchTerm: string,
  result: SearchResult[],
  depth = 0
): Promise<void> {
  if (depth > MAX_DEPTH) {
    return; // prevent infinite recursion in circular schemas
  }

  if (
    data !== undefined &&
    (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean')
  ) {
    if (matchesSearchTerm(data.toString(), searchTerm)) {
      addToResult(path, data, schema, searchTerm, result);
    }
  }
  if (
    (schema?.title !== undefined && matchesSearchTerm(schema.title, searchTerm)) ||
    (schema?.description !== undefined && matchesSearchTerm(schema.description, searchTerm))
  ) {
    addToResult(path, data, schema, searchTerm, result);
  }
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
  if (data === undefined || (typeof data === 'object' && !Array.isArray(data))) {
    const propertyNames = Object.keys(data ?? {}).concat(Object.keys(schema?.properties ?? {}));
    for (const propertyName of new Set(propertyNames)) {
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
  schema: JsonSchema | undefined,
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

function matchesSearchTerm(dataString: string, searchTerm: string): boolean {
  return dataString.toLowerCase().includes(searchTerm.toLowerCase());
}

export interface SearchResult {
  path: Path;
  data: any | undefined;
  schema: JsonSchema | undefined;
  searchTerm: string;
}

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