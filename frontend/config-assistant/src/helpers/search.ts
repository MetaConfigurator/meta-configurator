import type {Path} from '@/model/path';
import {useSessionStore} from '@/store/sessionStore';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';

/**
 * Searches for the given search term in the data and schema.
 * This will consider the title and description of the schema and all properties.
 *
 * @param searchTerm The term to search for.
 * @returns An array of search results.
 */
export function searchInDataAndSchema(searchTerm: string): SearchResult[] {
  const result: SearchResult[] = [];
  const data = useSessionStore().fileData;
  const schema: JsonSchema = useSessionStore().fileSchema;
  searchInDataAndSchemaRecursive(data, schema, [], searchTerm, result);
  return result;
}

function searchInDataAndSchemaRecursive(
  data: any | undefined,
  schema: JsonSchema | undefined,
  path: Path,
  searchTerm: string,
  result: SearchResult[]
): void {
  if (
    data !== undefined &&
    (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean')
  ) {
    if (matchesSearchTerm(data.toString(), searchTerm)) {
      result.push({
        path,
        data,
        schema,
        searchTerm,
      });
    }
  }
  if (
    (schema?.title !== undefined && matchesSearchTerm(schema.title, searchTerm)) ||
    (schema?.description !== undefined && matchesSearchTerm(schema.description, searchTerm))
  ) {
    result.push({
      path,
      data,
      schema,
      searchTerm,
    });
  }
  if (data && Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      searchInDataAndSchemaRecursive(
        data[i],
        schema?.subSchema(i),
        [...path, i],
        searchTerm,
        result
      );
    }
  } else if (typeof data === 'object') {
    const propertyNames = Object.keys(data).concat(Object.keys(schema?.properties ?? {}));
    for (const propertyName of propertyNames) {
      searchInDataAndSchemaRecursive(
        data[propertyName],
        schema?.subSchema(propertyName),
        [...path, propertyName],
        searchTerm,
        result
      );
      if (matchesSearchTerm(propertyName, searchTerm)) {
        result.push({
          path: [...path, propertyName],
          data: data[propertyName],
          schema: schema?.subSchema(propertyName),
          searchTerm,
        });
      }
    }
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
