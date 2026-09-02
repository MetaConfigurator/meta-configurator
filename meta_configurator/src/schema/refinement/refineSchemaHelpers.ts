import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import {JsonSchemaVisitor, type VisitorContext} from '@/schema/jsonSchemaVisitor';
import {fixEmptyArraySchemas} from '@/schema/inferJsonSchema';
import {inferSchema} from '@jsonhero/schema-infer';

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
  if (!schema.enum && schema.const === undefined) {
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

function getMatchingPatternPropertyNames(
  keys: string[],
  patternProperties: Record<string, JsonSchemaType> | undefined
): Set<string> {
  const matchingKeys = new Set<string>();
  if (!patternProperties) {
    return matchingKeys;
  }

  for (const pattern of Object.keys(patternProperties)) {
    const regex = new RegExp(pattern);
    for (const key of keys) {
      if (regex.test(key)) {
        matchingKeys.add(key);
      }
    }
  }

  return matchingKeys;
}

export function collectObjectSamples(samples: unknown[]): Record<string, unknown>[] {
  return samples.filter(
    (sample): sample is Record<string, unknown> =>
      typeof sample === 'object' && sample !== null && !Array.isArray(sample)
  );
}

function collectArrayItemSamples(samples: unknown[]): unknown[] {
  return samples.flatMap(sample => (Array.isArray(sample) ? sample : []));
}

export function inferSchemaFromValues(values: unknown[]): JsonSchemaType {
  if (values.length === 0) {
    return true;
  }

  const inferredArraySchema = fixEmptyArraySchemas(inferSchema(values).toJSONSchema());
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

class JsonSchemaSamplesVisitor extends JsonSchemaVisitor {
  private readonly samplesByPath = new Map<string, unknown[]>();
  private readonly schemasByPath = new Map<string, JsonSchemaObjectType>();

  constructor(
    samples: unknown[],
    private readonly visitSchemaNode: (schema: JsonSchemaObjectType, samples: unknown[]) => void
  ) {
    super(false);
    this.samplesByPath.set(this.serializeSchemaPath([]), samples);
  }

  protected visitSchema(schema: JsonSchemaObjectType, context: VisitorContext): void {
    const serializedPath = this.serializeSchemaPath(context.path);
    this.schemasByPath.set(serializedPath, schema);
    if (this.samplesByPath.has(serializedPath)) {
      this.visitSchemaNode(schema, this.samplesByPath.get(serializedPath) ?? []);
    }
  }

  protected visitProperty(name: string, _schema: JsonSchemaType, context: VisitorContext): void {
    const parentSamples = this.getParentSamples(context, 2);
    if (parentSamples) {
      this.setSamplesForContext(
        context,
        collectPropertySamples(collectObjectSamples(parentSamples), name)
      );
    }
  }

  protected visitPatternProperty(
    pattern: string,
    _schema: JsonSchemaType,
    context: VisitorContext
  ): void {
    const parentSamples = this.getParentSamples(context, 2);
    if (!parentSamples) {
      return;
    }

    const regex = new RegExp(pattern);
    const matchingSamples = collectObjectSamples(parentSamples).flatMap(sample =>
      Object.entries(sample)
        .filter(([key]) => regex.test(key))
        .map(([, value]) => value)
    );
    this.setSamplesForContext(context, matchingSamples);
  }

  protected visitSubSchemaKeyword(
    keyword: string,
    _schema: JsonSchemaType,
    context: VisitorContext
  ): void {
    const lastPathSegment = context.path[context.path.length - 1];
    const arrayIndex = typeof lastPathSegment === 'number' ? lastPathSegment : undefined;
    const parentSegmentCount = arrayIndex === undefined ? 1 : 2;
    const parentSamples = this.getParentSamples(context, parentSegmentCount);
    if (!parentSamples) {
      return;
    }

    if (keyword === 'items' && arrayIndex === undefined) {
      this.setSamplesForContext(context, collectArrayItemSamples(parentSamples));
    } else if (keyword === 'prefixItems' && arrayIndex !== undefined) {
      this.setSamplesForContext(context, collectSamplesAtArrayIndex(parentSamples, arrayIndex));
    } else if (keyword === 'additionalProperties') {
      this.setSamplesForContext(
        context,
        collectAdditionalPropertySamples(
          parentSamples,
          this.getParentSchema(context, parentSegmentCount)
        )
      );
    } else if (keyword === 'contains') {
      this.setSamplesForContext(context, parentSamples);
    }
  }

  protected visitCompositional(
    keyword: string,
    schemas: JsonSchemaType | JsonSchemaType[],
    context: VisitorContext
  ): void {
    const parentSamples = this.samplesByPath.get(this.serializeSchemaPath(context.path));
    if (!parentSamples) {
      return;
    }

    if (Array.isArray(schemas)) {
      schemas.forEach((_schema, index) => {
        this.samplesByPath.set(
          this.serializeSchemaPath([...context.path, keyword, index]),
          parentSamples
        );
      });
    } else {
      this.samplesByPath.set(this.serializeSchemaPath([...context.path, keyword]), parentSamples);
    }
  }

  protected visitConditional(
    _keyword: string,
    _schema: JsonSchemaType,
    context: VisitorContext
  ): void {
    const parentSamples = this.getParentSamples(context, 1);
    if (parentSamples) {
      this.setSamplesForContext(context, parentSamples);
    }
  }

  private getParentSamples(context: VisitorContext, segmentCount: number): unknown[] | undefined {
    return this.samplesByPath.get(this.serializeSchemaPath(context.path.slice(0, -segmentCount)));
  }

  private getParentSchema(
    context: VisitorContext,
    segmentCount: number
  ): JsonSchemaObjectType | undefined {
    return this.schemasByPath.get(this.serializeSchemaPath(context.path.slice(0, -segmentCount)));
  }

  private setSamplesForContext(context: VisitorContext, samples: unknown[]): void {
    this.samplesByPath.set(this.serializeSchemaPath(context.path), samples);
  }

  private serializeSchemaPath(schemaPath: readonly (string | number)[]): string {
    return JSON.stringify(schemaPath);
  }
}

function collectSamplesAtArrayIndex(samples: unknown[], index: number): unknown[] {
  return samples
    .filter((sample): sample is unknown[] => Array.isArray(sample) && index < sample.length)
    .map(sample => sample[index]);
}

function collectAdditionalPropertySamples(
  samples: unknown[],
  schema: JsonSchemaObjectType | undefined
): unknown[] {
  const explicitProperties = new Set(Object.keys(schema?.properties ?? {}));
  return collectObjectSamples(samples).flatMap(sample => {
    const matchingPatternPropertyNames = getMatchingPatternPropertyNames(
      Object.keys(sample),
      schema?.patternProperties
    );
    return Object.entries(sample)
      .filter(([key]) => !explicitProperties.has(key) && !matchingPatternPropertyNames.has(key))
      .map(([, value]) => value);
  });
}

export function visitSchemaWithSamples(
  schema: JsonSchemaType,
  samples: unknown[],
  visitSchemaNode: (schemaNode: JsonSchemaObjectType, samples: unknown[]) => void
): void {
  new JsonSchemaSamplesVisitor(samples, visitSchemaNode).traverse(schema);
}
