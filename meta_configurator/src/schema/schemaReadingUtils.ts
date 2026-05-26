import type {
  JsonSchemaObjectType,
  JsonSchemaType,
  SchemaPropertyType,
  SchemaPropertyTypes,
  TopLevelSchema,
} from '@/schema/jsonSchemaType';
import {NUMBER_OF_PROPERTY_TYPES, SCHEMA_PROPERTY_TYPES} from '@/schema/jsonSchemaType';
import type {Path} from '@/utility/path';
import type {ManagedData} from '@/data/managedData';
import type {TopLevelJsonSchemaWrapper} from '@/schema/topLevelJsonSchemaWrapper';
import {resolveInternalReferenceSchema} from '@/schema/schemaReferenceUtils';
import {nonBooleanSchema} from '@/schema/schemaProcessingUtils';
import {ValidationService} from '@/schema/validationService';

/**
 * Returns a string representation of the type of the property.
 * This does not necessarily match one of the JSON schema types,
 * e.g, it returns 'enum' if the property has an enum.
 */
export function getTypeDescription(schema: JsonSchemaObjectType): string {
  if (schema.enum) {
    return 'enum';
  }
  if (schema.oneOf && schema.oneOf.length > 0) {
    return 'oneOf';
  }
  if (schema.anyOf && schema.anyOf.length > 0) {
    return 'anyOf';
  }

  const type = schema.type || 'undefined';
  if (Array.isArray(type)) {
    if (type.length === NUMBER_OF_PROPERTY_TYPES) {
      return 'any';
    }
    return type.join(', ');
  }

  return type;
}
export function getAvailableDefinitionPaths(schema: any): string[] {
  const paths: string[] = [];

  if (schema?.$defs) {
    Object.keys(schema.$defs).forEach(key => {
      paths.push(`#/$defs/${key}`);
    });
  }

  if (schema?.definitions) {
    Object.keys(schema.definitions).forEach(key => {
      paths.push(`#/definitions/${key}`);
    });
  }

  return paths.sort();
}
export function isSchemaEmpty(schema: JsonSchemaType): boolean {
  if (schema === undefined || schema === null) {
    return true;
  }
  if (schema == true || schema == false) {
    return false;
  }
  return Object.keys(schema).length === 0;
}

export function resolveObjectSchemaVariant(
  schema: JsonSchemaObjectType | undefined,
  currentData: any,
  validationService: ValidationService
): JsonSchemaObjectType | undefined {
  if (!schema?.oneOf?.length) {
    return schema;
  }

  const variants = schema.oneOf
    .map(variant => nonBooleanSchema(variant))
    .filter((variant): variant is JsonSchemaObjectType => variant !== undefined);

  if (variants.length === 0) {
    return schema;
  }

  const fullyMatchingVariant = variants.find(variant =>
    validationService.validateSubSchema(variant, currentData).valid
  );
  if (fullyMatchingVariant) {
    return fullyMatchingVariant;
  }

  return variants[0];
}

export function getObjectSchemaAtDataPath(
  rootSchema: TopLevelSchema,
  path: Path,
  rootData: any,
  validationService: ValidationService = new ValidationService(rootSchema)
): JsonSchemaObjectType | undefined {
  let currentSchema = resolveObjectSchemaVariant(nonBooleanSchema(rootSchema), rootData, validationService);
  let currentData = rootData;

  for (const segment of path) {
    currentSchema = resolveObjectSchemaVariant(currentSchema, currentData, validationService);
    const nextSchema = nonBooleanSchema(currentSchema?.properties?.[segment] as JsonSchemaType);
    currentData = currentData?.[segment];
    currentSchema = resolveObjectSchemaVariant(nextSchema, currentData, validationService);
  }

  return currentSchema;
}

export function getParentObjectSchemaAtDataPath(
  rootSchema: TopLevelSchema,
  path: Path,
  rootData: any,
  validationService: ValidationService = new ValidationService(rootSchema)
): JsonSchemaObjectType | undefined {
  return getObjectSchemaAtDataPath(rootSchema, path.slice(0, -1), rootData, validationService);
}

export function findAvailableSchemaId(
  schemaData: ManagedData,
  path: Path,
  prefix: string,
  preferWithoutNumber: boolean = false
): Path {
  let num: number = 1;
  let success = false;
  while (num <= 100) {
    const id = num == 1 && preferWithoutNumber ? prefix : prefix + num;
    const fullPath = [...path, id];
    success = schemaData.dataAt(fullPath) === undefined;
    if (success) {
      return fullPath;
    } else {
      num++;
    }
  }
  throw Error('Could not find available id, tried until ' + prefix + num + '.');
}

export function isSubSchemaDefinedInDefinitions(absolutePath: Path) {
  if (absolutePath.length < 2) {
    return false;
  }
  const parentKey = absolutePath[absolutePath.length - 2];
  return parentKey === '$defs' || parentKey === 'definitions';
}

export function doesSchemaHaveType(
  schema: JsonSchemaType,
  type: SchemaPropertyType,
  mustBeExplicit: boolean = false
): boolean {
  if (schema === undefined) {
    return false;
  }
  if (schema === true) {
    return !mustBeExplicit;
  } else if (schema == false) {
    return false;
  }
  const types = schema.type;
  if (types === undefined) {
    return !mustBeExplicit;
  }

  if (Array.isArray(types) && type.length > 0) {
    return types.includes(type);

    // else: type is actually one string
  } else if (typeof types === 'string') {
    return type === types;
  }
  return false;
}

export function doesSchemaAllowNull(
  schema: JsonSchemaObjectType,
  rootSchema?: JsonSchemaType
): boolean {
  return getAllowedTypesOfSchema(schema, rootSchema).includes('null');
}

export function getAllowedTypesOfSchema(
  schema: JsonSchemaObjectType,
  rootSchema?: JsonSchemaType
): SchemaPropertyType[] {
  const directTypes = normalizeTypes(schema.type);
  if (directTypes.length > 0) {
    return directTypes;
  }

  if (schema.$ref && rootSchema) {
    const referencedSchema = resolveInternalReferenceSchema(schema.$ref, rootSchema);
    if (referencedSchema) {
      return inferTypesFromSchema(referencedSchema, rootSchema);
    }
  }

  return [];
}

export function setSchemaNullable(
  schema: JsonSchemaObjectType,
  nullable: boolean,
  rootSchema?: JsonSchemaType
) {
  if (nullable) {
    const nonNullableTypes = getAllowedTypesOfSchema(schema, rootSchema).filter(
      type => type !== 'null'
    );
    const nextTypes = [...new Set([...nonNullableTypes, 'null'])];
    schema.type = (nextTypes.length === 1 ? nextTypes[0]! : nextTypes) as SchemaPropertyTypes;
    return;
  }

  const nextTypes = normalizeTypes(schema.type).filter(type => type !== 'null');
  if (nextTypes.length === 0) {
    delete schema.type;
  } else {
    schema.type = (nextTypes.length === 1 ? nextTypes[0]! : nextTypes) as SchemaPropertyTypes;
  }
}

function normalizeTypes(types: SchemaPropertyTypes | undefined): SchemaPropertyType[] {
  if (types === undefined) {
    return [];
  }
  return Array.isArray(types) ? [...types] : [types];
}

function inferTypesFromSchema(
  schema: JsonSchemaObjectType,
  rootSchema?: JsonSchemaType
): SchemaPropertyType[] {
  const directTypes = normalizeTypes(schema.type);
  if (directTypes.length > 0) {
    return directTypes;
  }

  if (schema.$ref && rootSchema) {
    const referencedSchema = resolveInternalReferenceSchema(schema.$ref, rootSchema);
    if (referencedSchema) {
      return inferTypesFromSchema(referencedSchema, rootSchema);
    }
  }

  if (
    schema.properties !== undefined ||
    schema.patternProperties !== undefined ||
    schema.required !== undefined ||
    schema.dependentRequired !== undefined ||
    schema.additionalProperties !== undefined
  ) {
    return ['object'];
  }

  if (
    schema.items !== undefined ||
    schema.prefixItems !== undefined ||
    schema.contains !== undefined ||
    schema.minItems !== undefined ||
    schema.maxItems !== undefined ||
    schema.uniqueItems !== undefined
  ) {
    return ['array'];
  }

  if (schema.const !== undefined) {
    return inferTypesFromValue(schema.const);
  }

  if (schema.enum !== undefined && schema.enum.length > 0) {
    return [...new Set(schema.enum.flatMap(value => inferTypesFromValue(value)))];
  }

  return [];
}

function inferTypesFromValue(value: unknown): SchemaPropertyType[] {
  if (value === null) {
    return ['null'];
  }
  if (Array.isArray(value)) {
    return ['array'];
  }
  switch (typeof value) {
    case 'string':
      return ['string'];
    case 'boolean':
      return ['boolean'];
    case 'number':
      return [Number.isInteger(value) ? 'integer' : 'number'];
    case 'object':
      return ['object'];
    default:
      return [...SCHEMA_PROPERTY_TYPES];
  }
}

export function getSchemaTitle(schema: TopLevelJsonSchemaWrapper) {
  return schema.title || 'Untitled schema';
}
