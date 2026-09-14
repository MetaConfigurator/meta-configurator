import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';
import {JsonSchemaVisitor, type VisitorContext} from '@/schema/jsonSchemaVisitor';
import {ValidationService} from '@/schema/validationService';
import type {Path, PathElement} from '@/utility/path';
import {arePathsEqual, jsonPointerToPath, pathToJsonPointer} from '@/utility/pathUtils';
import {dataAt} from '@/utility/resolveDataAtPath';

export interface SchemaDataPathMatch {
  dataPath: Path;
  schemaPaths: Path[];
}

export interface SchemaPathDataMatch {
  schemaPath: Path;
  dataPaths: Path[];
}

function serializePath(path: Path | readonly (string | number)[]): string {
  return JSON.stringify(path.map(String));
}

function collectSchemaPaths(schemaRoot: JsonSchemaType): Path[] {
  class SchemaPathVisitor extends JsonSchemaVisitor {
    readonly paths: Path[] = [];

    protected visitSchema(_schema: JsonSchemaObjectType, context: VisitorContext): void {
      this.paths.push([...context.path]);
    }

    protected visitBooleanSchema(_value: boolean, context: VisitorContext): void {
      this.paths.push([...context.path]);
    }
  }

  const visitor = new SchemaPathVisitor(false);
  visitor.traverse(schemaRoot);
  return visitor.paths;
}

function isSchemaObject(schema: JsonSchemaType | undefined): schema is JsonSchemaObjectType {
  return typeof schema === 'object' && schema !== null;
}

/**
 * Resolves the schema nodes governing values in one instance document.
 *
 * A data value can have several governing schema paths: allOf branches all apply,
 * patternProperties may overlap, and a $ref target applies together with siblings on the
 * referencing schema. Callers that need the inverse relation should use findDataPathsUsingSchema.
 */
export class SchemaDataPathResolver {
  private readonly validationService: ValidationService | undefined;
  private readonly schemaPaths: Path[];

  constructor(private readonly schemaRoot: JsonSchemaType) {
    this.schemaPaths = collectSchemaPaths(schemaRoot);
    try {
      this.validationService = new ValidationService(schemaRoot as TopLevelSchema);
    } catch {
      // Structural paths can still be resolved when branch validation is unavailable.
      this.validationService = undefined;
    }
  }

  public findSchemaPathsForDataPath(dataPath: Path, data: unknown): Path[] {
    let schemaPaths = this.expandApplicableSchemaPaths([], data);
    let currentDataPath: Path = [];

    for (const pathElement of dataPath) {
      currentDataPath = currentDataPath.concat(pathElement);
      const value = dataAt(currentDataPath, data);
      schemaPaths = this.findChildSchemaPaths(schemaPaths, pathElement, value);
      if (schemaPaths.length === 0) {
        break;
      }
    }

    return schemaPaths;
  }

  public mapDataPathsToSchemaPaths(data: unknown): SchemaDataPathMatch[] {
    const result: SchemaDataPathMatch[] = [];

    const visitData = (value: unknown, dataPath: Path, schemaPaths: Path[]): void => {
      result.push({
        dataPath,
        schemaPaths,
      });

      if (Array.isArray(value)) {
        value.forEach((item, index) =>
          visitData(
            item,
            dataPath.concat(index),
            this.findChildSchemaPaths(schemaPaths, index, item)
          )
        );
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, child]) =>
          visitData(child, dataPath.concat(key), this.findChildSchemaPaths(schemaPaths, key, child))
        );
      }
    };

    visitData(data, [], this.expandApplicableSchemaPaths([], data));
    return result;
  }

  public mapSchemaPathsToDataPaths(data: unknown): SchemaPathDataMatch[] {
    const dataPathsBySchemaPath = new Map<string, Path[]>();

    for (const match of this.mapDataPathsToSchemaPaths(data)) {
      for (const schemaPath of match.schemaPaths) {
        const key = serializePath(schemaPath);
        dataPathsBySchemaPath.set(key, [...(dataPathsBySchemaPath.get(key) ?? []), match.dataPath]);
      }
    }

    return this.schemaPaths.map(schemaPath => ({
      schemaPath,
      dataPaths: dataPathsBySchemaPath.get(serializePath(schemaPath)) ?? [],
    }));
  }

  public findDataPathsUsingSchema(schemaPath: Path, data: unknown): Path[] {
    return this.mapDataPathsToSchemaPaths(data)
      .filter(match => match.schemaPaths.some(candidate => arePathsEqual(candidate, schemaPath)))
      .map(match => match.dataPath);
  }

  private findChildSchemaPaths(
    parentSchemaPaths: Path[],
    pathElement: PathElement,
    value: unknown
  ): Path[] {
    const candidates: Path[] = [];
    const deferredUnevaluatedPaths: Path[] = [];
    let evaluated = false;

    for (const parentPath of parentSchemaPaths) {
      const parentSchema = dataAt(parentPath, this.schemaRoot) as JsonSchemaType | undefined;
      if (!isSchemaObject(parentSchema)) {
        continue;
      }

      if (typeof pathElement === 'number') {
        const match = this.findArrayItemSchemaPaths(parentPath, parentSchema, pathElement, value);
        candidates.push(...match.paths);
        deferredUnevaluatedPaths.push(...match.unevaluatedPaths);
        evaluated ||= match.evaluated;
      } else {
        const match = this.findObjectPropertySchemaPaths(parentPath, parentSchema, pathElement);
        candidates.push(...match.paths);
        deferredUnevaluatedPaths.push(...match.unevaluatedPaths);
        evaluated ||= match.evaluated;
      }
    }

    if (!evaluated) {
      candidates.push(...deferredUnevaluatedPaths);
    }

    return this.uniquePaths(
      candidates.flatMap(candidate => this.expandApplicableSchemaPaths(candidate, value))
    );
  }

  private findObjectPropertySchemaPaths(
    parentPath: Path,
    parentSchema: JsonSchemaObjectType,
    propertyName: string
  ): {paths: Path[]; unevaluatedPaths: Path[]; evaluated: boolean} {
    const paths: Path[] = [];
    const unevaluatedPaths: Path[] = [];
    let evaluated = false;

    if (parentSchema.properties?.[propertyName] !== undefined) {
      paths.push(parentPath.concat('properties', propertyName));
      evaluated = true;
    }

    for (const pattern of Object.keys(parentSchema.patternProperties ?? {})) {
      try {
        if (new RegExp(pattern).test(propertyName)) {
          paths.push(parentPath.concat('patternProperties', pattern));
          evaluated = true;
        }
      } catch {
        // Invalid regular expressions are handled by schema validation.
      }
    }

    if (!evaluated && parentSchema.additionalProperties !== undefined) {
      paths.push(parentPath.concat('additionalProperties'));
      evaluated = true;
    }
    if (parentSchema.unevaluatedProperties !== undefined) {
      unevaluatedPaths.push(parentPath.concat('unevaluatedProperties'));
    }

    return {paths, unevaluatedPaths, evaluated};
  }

  private findArrayItemSchemaPaths(
    parentPath: Path,
    parentSchema: JsonSchemaObjectType,
    index: number,
    value: unknown
  ): {paths: Path[]; unevaluatedPaths: Path[]; evaluated: boolean} {
    const paths: Path[] = [];
    const unevaluatedPaths: Path[] = [];
    let evaluated = false;
    const prefixItems = parentSchema.prefixItems ?? [];
    const items = parentSchema.items as JsonSchemaType | JsonSchemaType[] | undefined;
    const legacyItems = Array.isArray(items) ? items : undefined;

    if (index < prefixItems.length) {
      paths.push(parentPath.concat('prefixItems', index));
      evaluated = true;
    } else if (legacyItems && index < legacyItems.length) {
      paths.push(parentPath.concat('items', index));
      evaluated = true;
    } else if (legacyItems && parentSchema.additionalItems !== undefined) {
      paths.push(parentPath.concat('additionalItems'));
      evaluated = true;
    } else if (!legacyItems && items !== undefined) {
      paths.push(parentPath.concat('items'));
      evaluated = true;
    }

    if (
      parentSchema.contains !== undefined &&
      this.schemaMatchesValue(parentSchema.contains, value)
    ) {
      paths.push(parentPath.concat('contains'));
      evaluated = true;
    }

    if (parentSchema.unevaluatedItems !== undefined) {
      unevaluatedPaths.push(parentPath.concat('unevaluatedItems'));
    }

    return {paths, unevaluatedPaths, evaluated};
  }

  private expandApplicableSchemaPaths(
    schemaPath: Path,
    value: unknown,
    visited = new Set<string>()
  ): Path[] {
    const serializedPath = pathToJsonPointer(schemaPath);
    if (visited.has(serializedPath)) {
      return [];
    }
    const nextVisited = new Set(visited);
    nextVisited.add(serializedPath);

    const schema = dataAt(schemaPath, this.schemaRoot) as JsonSchemaType | undefined;
    if (schema === undefined) {
      return [];
    }

    const result: Path[] = [schemaPath];
    if (!isSchemaObject(schema)) {
      return result;
    }

    if (typeof schema.$ref === 'string' && (schema.$ref === '#' || schema.$ref.startsWith('#/'))) {
      result.push(
        ...this.expandApplicableSchemaPaths(jsonPointerToPath(schema.$ref), value, nextVisited)
      );
    }

    for (const [index] of (schema.allOf ?? []).entries()) {
      result.push(
        ...this.expandApplicableSchemaPaths(schemaPath.concat('allOf', index), value, nextVisited)
      );
    }

    for (const keyword of ['oneOf', 'anyOf'] as const) {
      for (const [index, branch] of (schema[keyword] ?? []).entries()) {
        if (this.schemaMatchesValue(branch, value)) {
          result.push(
            ...this.expandApplicableSchemaPaths(
              schemaPath.concat(keyword, index),
              value,
              nextVisited
            )
          );
        }
      }
    }

    if (schema.if !== undefined) {
      const selectedKeyword = this.schemaMatchesValue(schema.if, value) ? 'then' : 'else';
      if (schema[selectedKeyword] !== undefined) {
        result.push(
          ...this.expandApplicableSchemaPaths(
            schemaPath.concat(selectedKeyword),
            value,
            nextVisited
          )
        );
      }
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const propertyName of Object.keys(schema.dependentSchemas ?? {})) {
        if (propertyName in value) {
          result.push(
            ...this.expandApplicableSchemaPaths(
              schemaPath.concat('dependentSchemas', propertyName),
              value,
              nextVisited
            )
          );
        }
      }
      for (const [propertyName, dependency] of Object.entries(schema.dependencies ?? {})) {
        if (propertyName in value && !Array.isArray(dependency)) {
          result.push(
            ...this.expandApplicableSchemaPaths(
              schemaPath.concat('dependencies', propertyName),
              value,
              nextVisited
            )
          );
        }
      }
    }

    return this.uniquePaths(result);
  }

  private schemaMatchesValue(schema: JsonSchemaType, value: unknown): boolean {
    if (typeof schema === 'boolean') {
      return schema;
    }
    if (!this.validationService) {
      return false;
    }
    try {
      return this.validationService.validateSubSchema(schema, value).valid;
    } catch {
      return false;
    }
  }

  private uniquePaths(paths: Path[]): Path[] {
    const seen = new Set<string>();
    return paths.filter(path => {
      const key = serializePath(path);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

export function findSchemaPathsForDataPath(
  dataPath: Path,
  data: unknown,
  schemaRoot: unknown
): Path[] {
  return new SchemaDataPathResolver(schemaRoot as JsonSchemaType).findSchemaPathsForDataPath(
    dataPath,
    data
  );
}

export function findDataPathsUsingSchema(
  schemaPath: Path,
  data: unknown,
  schemaRoot: unknown
): Path[] {
  return new SchemaDataPathResolver(schemaRoot as JsonSchemaType).findDataPathsUsingSchema(
    schemaPath,
    data
  );
}
