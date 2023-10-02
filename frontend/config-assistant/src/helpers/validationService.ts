import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/model/JsonSchemaType';
import type {ErrorObject} from 'ajv';
import type {ValidateFunction} from 'ajv/dist/2020';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type {Path} from '@/model/path';
import {pathToJsonPointer} from '@/helpers/pathHelper';
import _ from 'lodash';

export class ValidationService {
  static readonly TOP_LEVEL_SCHEMA_KEY = '$topLevelSchema';

  topLevelSchema: TopLevelSchema;
  private _ajv: Ajv2020 | undefined;
  private _validationFunction: ValidateFunction | undefined;

  /**
   * Creates a new validation service.
   * @param topLevelSchema the top level schema
   * @throws Error if the schema is invalid
   */
  constructor(topLevelSchema: TopLevelSchema) {
    console.log('creating validation service', topLevelSchema);
    console.trace();
    this.topLevelSchema = topLevelSchema;
    this.initValidationFunction();
  }

  private initValidationFunction() {
    this._ajv = new Ajv2020({
      strict: false,
      allErrors: true,
    });
    addFormats(this._ajv);
    this._ajv.addSchema(
      this.topLevelSchema,
      this.topLevelSchema?.$id ?? ValidationService.TOP_LEVEL_SCHEMA_KEY
    );
    this._validationFunction = this._ajv.getSchema(
      this.topLevelSchema?.$id ?? ValidationService.TOP_LEVEL_SCHEMA_KEY
    );
  }

  public validate(data: any): ValidationResults {
    if (!this._validationFunction) {
      // schema could not be compiled because it was invalid
      return new ValidationResults([]); // optimistic approach
    }
    this._validationFunction(data);
    const errors = this._validationFunction.errors || [];
    return new ValidationResults(errors);
  }

  /**
   * Validates a sub schema of the top level schema.
   * This will inject the definitions of the top level schema into the sub schema,
   * so that the sub schema can reference them.
   *
   * @param schema the sub schema
   * @param data the data to validate
   */
  public validateSubSchema(schema: JsonSchemaObjectType, data: any): ValidationResults {
    const key = schema.$id || schema.id || undefined;

    if (key && this._ajv?.getSchema(key) === undefined) {
      const schemaWithUpdatedRefs = this.updateReferences(schema);
      this._ajv?.addSchema(schemaWithUpdatedRefs, key);
    }

    let validationFunction: ValidateFunction | undefined;
    if (key) {
      validationFunction = this._ajv?.getSchema(key);
    } else {
      const schemaWithUpdatedRefs = this.updateReferences(schema);
      validationFunction = this._ajv?.compile(schemaWithUpdatedRefs);
    }

    if (!validationFunction) {
      return new ValidationResults([]); // optimistic approach
    }

    validationFunction(data);
    const errors = validationFunction.errors || [];
    return new ValidationResults(errors);
  }

  private injectDefinitions(schema: JsonSchemaObjectType) {
    const result = {...schema};
    if (result.$defs === undefined) {
      result.$defs = this.topLevelSchema.definitions || this.topLevelSchema.$defs || {};
    }
    return result;
  }

  private updateReferences(schema: JsonSchemaType) {
    const result = _.cloneDeep(schema);

    if (typeof result !== 'object' || result.$defs !== undefined) {
      return result;
    }

    if (result.$ref !== undefined) {
      result.$ref = this.topLevelSchema.$id + result.$ref;
    }

    if (result.if) {
      result.if = this.updateReferences(result.if);
    }
    if (result.then) {
      result.then = this.updateReferences(result.then);
    }
    if (result.else) {
      result.else = this.updateReferences(result.else);
    }
    if (result.allOf) {
      result.allOf = result.allOf.map(subSchema => this.updateReferences(subSchema));
    }
    if (result.anyOf) {
      result.anyOf = result.anyOf.map(subSchema => this.updateReferences(subSchema));
    }
    if (result.oneOf) {
      result.oneOf = result.oneOf.map(subSchema => this.updateReferences(subSchema));
    }
    if (result.not) {
      result.not = this.updateReferences(result.not);
    }
    if (result.items) {
      result.items = this.updateReferences(result.items);
    }
    if (result.prefixItems) {
      result.prefixItems = result.prefixItems.map(subSchema => this.updateReferences(subSchema));
    }
    if (result.contains) {
      result.contains = this.updateReferences(result.contains);
    }
    if (result.additionalProperties) {
      result.additionalProperties = this.updateReferences(result.additionalProperties);
    }
    if (result.propertyNames) {
      result.propertyNames = this.updateReferences(result.propertyNames);
    }
    if (result.unevaluatedItems) {
      result.unevaluatedItems = this.updateReferences(result.unevaluatedItems);
    }
    if (result.unevaluatedProperties) {
      result.unevaluatedProperties = this.updateReferences(result.unevaluatedProperties);
    }
    if (result.contentSchema) {
      result.contentSchema = this.updateReferences(result.contentSchema);
    }
    if (result.properties) {
      for (const key of Object.keys(result.properties)) {
        result.properties[key] = this.updateReferences(result.properties[key]);
      }
    }
    if (result.patternProperties) {
      for (const key of Object.keys(result.patternProperties)) {
        result.patternProperties[key] = this.updateReferences(result.patternProperties[key]);
      }
    }
    if (result.dependentSchemas) {
      for (const key of Object.keys(result.dependentSchemas)) {
        result.dependentSchemas[key] = this.updateReferences(result.dependentSchemas[key]);
      }
    }

    return result;
  }
}

export class ValidationResults {
  valid: boolean;
  errors: Array<ErrorObject>;

  constructor(errors: Array<ErrorObject>) {
    this.valid = errors.length == 0;
    this.errors = errors;
  }

  /**
   * Filters for errors that are at or below the given path.
   * @param path the path
   * @returns the filtered errors
   */
  public filterForPath(path: Path): ValidationResults {
    const jsonPointer = pathToJsonPointer(path);
    const filteredErrors = this.errors.filter(error => error.instancePath.startsWith(jsonPointer));
    return new ValidationResults(filteredErrors);
  }

  /**
   * Filters for errors that are exactly at the given path.
   * @param  path the path
   * @returns the filtered errors
   */
  public filterForExactPath(path: Path): ValidationResults {
    const jsonPointer = pathToJsonPointer(path);
    const filteredErrors = this.errors.filter(error => error.instancePath == jsonPointer);
    return new ValidationResults(filteredErrors);
  }

  public isValidForPath(path: Path): boolean {
    return this.filterForPath(path).valid;
  }
}
