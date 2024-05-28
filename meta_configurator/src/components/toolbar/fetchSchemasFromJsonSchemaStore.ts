import type {SchemaOption} from '@/packaged-schemas/schemaOption';
import {JSON_SCHEMA_STORE_CATALOG_URL} from '@/constants';

/**
 * Fetches all available schemas from the JSON Schema Store.
 */
export async function fetchSchemasFromJSONSchemaStore(): Promise<SchemaOption[]> {
  const fetchedSchemas: SchemaOption[] = [];
  const response = await fetch(JSON_SCHEMA_STORE_CATALOG_URL);
  const data = await response.json();
  const schemas = data.schemas;

  schemas.forEach((schema: {name: string; url: string; key: string}) => {
    fetchedSchemas.push({
      label: schema.name,
      icon: 'pi pi-fw pi-code',
      url: schema.url,
      key: schema.key,
    });
  });

  return fetchedSchemas;
}
