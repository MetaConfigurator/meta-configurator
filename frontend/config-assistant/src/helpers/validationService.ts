import type {JsonSchemaObjectType, TopLevelSchema} from '@/model/JsonSchemaType';
import type {ErrorObject} from 'ajv';
import type {ValidateFunction} from 'ajv/dist/2020';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type {Path} from '@/model/path';
import {pathToJsonPointer} from '@/helpers/pathHelper';

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
    this.topLevelSchema = topLevelSchema;
    this.initValidationFunction();
  }

  private initValidationFunction() {
    this._ajv = new Ajv2020({
      strict: false,
      allErrors: true,
    });
    addFormats(this._ajv);
    this._ajv.addSchema(this.topLevelSchema, ValidationService.TOP_LEVEL_SCHEMA_KEY);
    this._validationFunction = this._ajv.getSchema(ValidationService.TOP_LEVEL_SCHEMA_KEY);
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
    const key = schema.$id || schema.id || JSON.stringify(schema);

    // inject definitions
    if (this._ajv?.getSchema(key) === undefined) {
      const schemaWithDefinitions = this.injectDefinitions(schema);
      this._ajv?.addSchema(schemaWithDefinitions, key);
    }
    const validationFunction: ValidateFunction | undefined = this._ajv?.getSchema(key);
    if (!validationFunction) {
      console.warn('Could not compile schema for key ' + key);
      return new ValidationResults([]); // optimistic approach
    }
    validationFunction(data);
    const errors = validationFunction.errors || [];
    console.log('errors', errors);
    return new ValidationResults(errors);
  }

  private injectDefinitions(schema: JsonSchemaObjectType) {
    const result = {...schema};
    if (result.$defs === undefined) {
      result.$defs = this.topLevelSchema.definitions || this.topLevelSchema.$defs || {};
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
