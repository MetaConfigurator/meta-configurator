import {inferSchema} from '@jsonhero/schema-infer';
import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import {trimDataToMaxSize} from '@/utility/trimData';
import {useSettings} from '@/settings/useSettings';
import {JsonSchemaVisitor} from '@/schema/jsonSchemaVisitor';

export function inferJsonSchema(sampleData: unknown): JsonSchemaType {
  return inferJsonSchemaFromSamples([sampleData]);
}

/**
 * Infers a single schema that satisfies all given data instances: every instance
 * refines the inference further, so the result accepts each of them.
 */
export function inferJsonSchemaFromSamples(samples: unknown[]): JsonSchemaType {
  if (samples.length === 0) {
    throw new Error('No data instances were provided for schema inference.');
  }

  const {maxDocumentSizeForSchemaInference, minObjectPropertyCountToPreserve} =
    useSettings().value.performance;
  const maximumSizeInKiB = maxDocumentSizeForSchemaInference / 1024;

  let inference: ReturnType<typeof inferSchema> | undefined;
  for (const sample of samples) {
    const trimmedSample = trimDataToMaxSize(
      sample,
      maximumSizeInKiB,
      minObjectPropertyCountToPreserve
    );
    inference = inferSchema(trimmedSample, inference);
  }

  return allowItemsInInferredEmptyArraySchemas(inference!.toJSONSchema());
}

export function allowItemsInInferredEmptyArraySchemas(schema: JsonSchemaType): JsonSchemaType {
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
