import {inferSchema} from '@jsonhero/schema-infer';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';
import {trimDataToMaxSize} from '@/utility/trimData';
import {useSettings} from '@/settings/useSettings';

export function inferJsonSchema(sampleData: any): JsonSchemaType {
  return inferJsonSchemaFromMultiple([sampleData]);
}

/**
 * Infers a single JSON Schema that satisfies *all* of the given data instances.
 * Each instance refines the inference (via @jsonhero/schema-infer), so the
 * resulting schema accepts every provided instance.
 */
export function inferJsonSchemaFromMultiple(samples: any[]): JsonSchemaType {
  if (samples.length === 0) {
    throw new Error('No data instances were provided for schema inference.');
  }
  // trim sample data if needed
  const maximumSizeInKiB = useSettings().value.performance.maxDocumentSizeForSchemaInference / 1024; // convert bytes to KiB
  const minObjectPropertyCountToPreserve =
    useSettings().value.performance.minObjectPropertyCountToPreserve;

  let inference = undefined;
  for (const sample of samples) {
    const trimmed = trimDataToMaxSize(sample, maximumSizeInKiB, minObjectPropertyCountToPreserve);
    inference = inferSchema(trimmed, inference);
  }
  return fixEmptyArraySchemas(inference!.toJSONSchema());
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
