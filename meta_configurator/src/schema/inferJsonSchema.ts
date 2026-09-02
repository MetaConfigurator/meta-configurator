import {inferSchema} from '@jsonhero/schema-infer';
import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import {trimDataToMaxSize} from '@/utility/trimData';
import {useSettings} from '@/settings/useSettings';
import {JsonSchemaVisitor} from '@/schema/jsonSchemaVisitor';

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

export function fixEmptyArraySchemas(schema: JsonSchemaType): JsonSchemaType {
  new EmptyArraySchemaVisitor(false).traverse(schema);
  return schema;
}

class EmptyArraySchemaVisitor extends JsonSchemaVisitor {
  protected visitSchema(schema: JsonSchemaObjectType): void {
    if (schema.type === 'array' && schema.items === false) {
      schema.items = true;
    }
  }
}
