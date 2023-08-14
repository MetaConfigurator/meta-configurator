import {errorService} from '@/main';
import type {SchemaOption} from '@/model/SchemaOption';
import {JSON_SCHEMA_STORE_CATALOG} from '@/constants';

export async function fetchWebSchemas(): Promise<SchemaOption[]> {
  let fetchedSchemas: SchemaOption[] = [];

  const schemaStoreURL = JSON_SCHEMA_STORE_CATALOG;

  try {
    const response = await fetch(schemaStoreURL);
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
  } catch (error) {
    // Handle the error if there's an issue fetching the schema.
    errorService.onError(error);
  }

  return fetchedSchemas;
}
