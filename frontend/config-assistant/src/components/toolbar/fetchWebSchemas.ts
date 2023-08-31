import type {SchemaOption} from '@/model/SchemaOption';
import {JSON_SCHEMA_STORE_CATALOG_URL} from '@/constants';

export async function fetchWebSchemas(toast?: any): Promise<SchemaOption[]> {
  let fetchedSchemas: SchemaOption[] = [];
  const response = await fetch(JSON_SCHEMA_STORE_CATALOG_URL);
  const data = await response.json();
  const schemas = data.schemas;
  const schemaName = schemas.label || 'Unknown Schema';
  schemas.forEach((schema: {name: string; url: string; key: string}) => {
    fetchedSchemas.push({
      label: schema.name,
      icon: 'pi pi-fw pi-code',
      url: schema.url,
      key: schema.key,
    });
  });
  if (toast) {
    toast.add({
      severity: 'info',
      summary: 'Info',
      detail: `"${schemaName}" fetched successfully!`,
      life: 3000,
    });
  }
  return fetchedSchemas;
}
