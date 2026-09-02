import {inferSchema} from '@jsonhero/schema-infer';
import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import {trimDataToMaxSize} from '@/utility/trimData';
import {useSettings} from '@/settings/useSettings';
import {JsonSchemaVisitor} from '@/schema/jsonSchemaVisitor';

export function inferJsonSchema(sampleData: unknown): JsonSchemaType {
  const {maxDocumentSizeForSchemaInference, minObjectPropertyCountToPreserve} =
    useSettings().value.performance;
  const maximumSizeInKiB = maxDocumentSizeForSchemaInference / 1024;
  const trimmedSampleData = trimDataToMaxSize(
    sampleData,
    maximumSizeInKiB,
    minObjectPropertyCountToPreserve
  );

  return allowItemsInInferredEmptyArraySchemas(inferSchema(trimmedSampleData).toJSONSchema());
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
