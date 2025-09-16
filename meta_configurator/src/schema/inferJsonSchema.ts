import {inferSchema} from '@jsonhero/schema-infer';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';
import {trimDataToMaxSize} from '@/utility/trimData';
import {useSettings} from '@/settings/useSettings';

export function inferJsonSchema(sampleData: any): JsonSchemaType {
  // trim sample data if needed
  const maximumSizeInKiB = useSettings().value.performance.maxDocumentSizeForSchemaInference / 1024; // convert bytes to KiB
  const minObjectPropertyCountToPreserve =
    useSettings().value.performance.minObjectPropertyCountToPreserve;
  sampleData = trimDataToMaxSize(sampleData, maximumSizeInKiB, minObjectPropertyCountToPreserve);
  return fixEmptyArraySchemas(inferSchema(sampleData).toJSONSchema());
}

function fixEmptyArraySchemas(schema: any): any {
  // schemas inferred from empty arrays have "items": false, which is not very useful and can break downstream logic
  // instead, we change it to "items": true, which means "any type"
  if (schema && typeof schema === 'object') {
    if (schema.type === 'array' && schema.items === false) {
      schema.items = true; // means “any type”
    }
    for (const key of Object.keys(schema)) {
      schema[key] = fixEmptyArraySchemas(schema[key]);
    }
  }
  return schema;
}
