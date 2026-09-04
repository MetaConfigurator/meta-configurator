import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import {JsonSchemaVisitor, type VisitorContext} from '@/schema/jsonSchemaVisitor';
import {allowItemsInInferredEmptyArraySchemas} from '@/schema/inferJsonSchema';
import {SchemaDataPathResolver} from '@/schema/schemaDataPathResolver';
import {inferSchema} from '@jsonhero/schema-infer';
import {dataAt} from '@/utility/resolveDataAtPath';

function isSchemaObject(schema: JsonSchemaType): schema is JsonSchemaObjectType {
  return typeof schema === 'object' && schema !== null;
}

export function getValueType(
  value: unknown
): 'null' | 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string' {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  switch (typeof value) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return Number.isInteger(value) ? 'integer' : 'number';
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    default:
      return 'string';
  }
}

export function getSchemaTypes(schema: JsonSchemaObjectType): string[] {
  if (schema.type === undefined) {
    return [];
  }
  if (Array.isArray(schema.type)) {
    return schema.type;
  }
  return [schema.type];
}

export function schemaAllowsValueType(schema: JsonSchemaObjectType, valueType: string): boolean {
  const schemaTypes = getSchemaTypes(schema);
  if (schemaTypes.length === 0) {
    return true;
  }
  if (schemaTypes.includes(valueType)) {
    return true;
  }
  return valueType === 'integer' && schemaTypes.includes('number');
}

/** Enum and const schemas already describe their values, so examples add nothing. */
export function dropExamplesFromFixedValueSchema(schema: JsonSchemaObjectType): boolean {
  if (schema.enum === undefined && schema.const === undefined) {
    return false;
  }
  delete schema.examples;
  return true;
}

export function uniqueByJsonValue(values: unknown[]): unknown[] {
  const seenSerializedValues = new Set<string>();
  return values.filter(value => {
    const serializedValue = JSON.stringify(value);
    if (seenSerializedValues.has(serializedValue)) {
      return false;
    }
    seenSerializedValues.add(serializedValue);
    return true;
  });
}

export function collectObjectSamples(samples: unknown[]): Record<string, unknown>[] {
  return samples.filter(
    (sample): sample is Record<string, unknown> =>
      typeof sample === 'object' && sample !== null && !Array.isArray(sample)
  );
}

export function inferSchemaFromValues(values: unknown[]): JsonSchemaType {
  if (values.length === 0) {
    return true;
  }

  const inferredArraySchema = allowItemsInInferredEmptyArraySchemas(
    inferSchema(values).toJSONSchema()
  );
  if (isSchemaObject(inferredArraySchema) && inferredArraySchema.type === 'array') {
    return inferredArraySchema.items ?? true;
  }
  return inferredArraySchema;
}

export function collectPropertySamples(
  objectSamples: Record<string, unknown>[],
  propertyName: string
): unknown[] {
  return objectSamples.filter(sample => propertyName in sample).map(sample => sample[propertyName]);
}

function serializeSchemaPath(schemaPath: readonly (string | number)[]): string {
  return JSON.stringify(schemaPath.map(String));
}

class JsonSchemaSamplesVisitor extends JsonSchemaVisitor {
  private readonly samplesByPath = new Map<string, unknown[]>();

  constructor(
    samples: unknown[],
    schemaRoot: JsonSchemaType,
    private readonly visitSchemaNode: (schema: JsonSchemaObjectType, samples: unknown[]) => void
  ) {
    super(false);
    const resolver = new SchemaDataPathResolver(schemaRoot);

    for (const sample of samples) {
      for (const match of resolver.mapDataPathsToSchemaPaths(sample)) {
        const value = dataAt(match.dataPath, sample);
        for (const schemaPath of match.schemaPaths) {
          const key = serializeSchemaPath(schemaPath);
          this.samplesByPath.set(key, [...(this.samplesByPath.get(key) ?? []), value]);
        }
      }
    }
  }

  protected visitSchema(schema: JsonSchemaObjectType, context: VisitorContext): void {
    const samplesForNode = this.samplesByPath.get(serializeSchemaPath(context.path));
    if (samplesForNode) {
      this.visitSchemaNode(schema, samplesForNode);
    }
  }
}

export function visitSchemaWithSamples(
  schema: JsonSchemaType,
  samples: unknown[],
  visitSchemaNode: (schemaNode: JsonSchemaObjectType, samples: unknown[]) => void
): void {
  new JsonSchemaSamplesVisitor(samples, schema, visitSchemaNode).traverse(schema);
}
