import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';
import Ajv from 'ajv';
import type {ValidateFunction} from 'ajv/dist/2020';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import _ from 'lodash';
import Ajv2019 from 'ajv/dist/2019';
import {
  getMatchingAjvVersion,
  getTopLevelSchemaId,
  ValidationResult,
} from '@/schema/validationUtils';

/**
 * Service for validating data against a JSON schema.
 * This uses the ajv library.
 * It also supports validating against sub schemas of the top level schema.
 */
export class ValidationService {
  topLevelSchema: TopLevelSchema;
  private _ajv: Ajv2020 | Ajv2019 | Ajv | undefined;
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
    this._ajv = getMatchingAjvVersion(this.topLevelSchema);
    addFormats(this._ajv);
    const topLevelSchemaId = getTopLevelSchemaId(this.topLevelSchema);
    this._ajv.addSchema(this.topLevelSchema, topLevelSchemaId);
    this._validationFunction = this._ajv.getSchema(topLevelSchemaId);
  }

  public validate(data: any): ValidationResult {
    if (!this._validationFunction) {
      // schema could not be compiled because it was invalid
      return new ValidationResult([]); // optimistic approach
    }
    this._validationFunction(data);
    const errors = this._validationFunction.errors || [];
    if (errors.length > 0) {
      console.debug('Validation errors:', errors);
    }
    return new ValidationResult(errors);
  }

  /**
   * Validates a sub schema of the top level schema.
   * This will inject the definitions of the top level schema into the sub schema,
   * so that the sub schema can reference them.
   *
   * @param schema the sub schema
   * @param data the data to validate
   */
  public validateSubSchema(schema: JsonSchemaObjectType, data: any): ValidationResult {
    const key = schema.$id || schema.id || undefined;

    if (key && this._ajv?.getSchema(key) === undefined) {
      const schemaWithUpdatedRefs = this.updateReferencesAndReplaceCustomKeywords(schema);
      this._ajv?.addSchema(schemaWithUpdatedRefs, key);
    }

    let validationFunction: ValidateFunction | undefined;
    if (key) {
      validationFunction = this._ajv?.getSchema(key);
    } else {
      const schemaWithUpdatedRefs = this.updateReferencesAndReplaceCustomKeywords(schema);
      validationFunction = this._ajv?.compile(schemaWithUpdatedRefs);
    }

    if (!validationFunction) {
      return new ValidationResult([]); // optimistic approach
    }

    validationFunction(data);
    const errors = validationFunction.errors || [];
    return new ValidationResult(errors);
  }

  /**
   * Updates all references in the given schema to point to the top level schema.
   * This allows the schema to reference definitions from the top level schema
   * and ajv to validate the schema.
   * Also replaces custom keywords with the corresponding JSON schema keywords.
   * Currently, this only replaces the `conditions` keyword by `allOf`.
   *
   * @param schema the sub-schema
   * @private
   */
  private updateReferencesAndReplaceCustomKeywords(schema: JsonSchemaType) {
    let result = _.cloneDeep(schema);
    result = this.replaceConditionsWithAllOfs(result);

    if (typeof result !== 'object' || result.$defs !== undefined) {
      return result;
    }

    if (result.$ref !== undefined) {
      result.$ref = getTopLevelSchemaId(this.topLevelSchema) + result.$ref;
    }

    if (result.if) {
      result.if = this.updateReferencesAndReplaceCustomKeywords(result.if);
    }
    if (result.then) {
      result.then = this.updateReferencesAndReplaceCustomKeywords(result.then);
    }
    if (result.else) {
      result.else = this.updateReferencesAndReplaceCustomKeywords(result.else);
    }
    if (result.allOf) {
      result.allOf = result.allOf.map(subSchema =>
        this.updateReferencesAndReplaceCustomKeywords(subSchema)
      );
    }
    if (result.anyOf) {
      result.anyOf = result.anyOf.map(subSchema =>
        this.updateReferencesAndReplaceCustomKeywords(subSchema)
      );
    }
    if (result.oneOf) {
      result.oneOf = result.oneOf.map(subSchema =>
        this.updateReferencesAndReplaceCustomKeywords(subSchema)
      );
    }
    if (result.not) {
      result.not = this.updateReferencesAndReplaceCustomKeywords(result.not);
    }
    if (result.items) {
      result.items = this.updateReferencesAndReplaceCustomKeywords(result.items);
    }
    if (result.prefixItems) {
      result.prefixItems = result.prefixItems.map(subSchema =>
        this.updateReferencesAndReplaceCustomKeywords(subSchema)
      );
    }
    if (result.contains) {
      result.contains = this.updateReferencesAndReplaceCustomKeywords(result.contains);
    }
    if (result.additionalProperties) {
      result.additionalProperties = this.updateReferencesAndReplaceCustomKeywords(
        result.additionalProperties
      );
    }
    if (result.propertyNames) {
      result.propertyNames = this.updateReferencesAndReplaceCustomKeywords(result.propertyNames);
    }
    if (result.unevaluatedItems) {
      result.unevaluatedItems = this.updateReferencesAndReplaceCustomKeywords(
        result.unevaluatedItems
      );
    }
    if (result.unevaluatedProperties) {
      result.unevaluatedProperties = this.updateReferencesAndReplaceCustomKeywords(
        result.unevaluatedProperties
      );
    }
    if (result.contentSchema) {
      result.contentSchema = this.updateReferencesAndReplaceCustomKeywords(result.contentSchema);
    }
    if (result.properties) {
      for (const key of Object.keys(result.properties)) {
        result.properties[key] = this.updateReferencesAndReplaceCustomKeywords(
          result.properties[key]
        );
      }
    }
    if (result.patternProperties) {
      for (const key of Object.keys(result.patternProperties)) {
        result.patternProperties[key] = this.updateReferencesAndReplaceCustomKeywords(
          result.patternProperties[key]
        );
      }
    }
    if (result.dependentSchemas) {
      for (const key of Object.keys(result.dependentSchemas)) {
        result.dependentSchemas[key] = this.updateReferencesAndReplaceCustomKeywords(
          result.dependentSchemas[key]
        );
      }
    }

    return result;
  }

  /**
   * Replaces our custom `conditions` keyword with `allOf` to ensure that ajv can validate the schema.
   */
  private replaceConditionsWithAllOfs(schema: JsonSchemaType): JsonSchemaType {
    if (typeof schema !== 'object') {
      return schema;
    }
    if (schema.conditions) {
      schema.allOf = (schema.allOf ?? []).concat(schema.conditions);
      delete schema.conditions;
    }
    return schema;
  }
}
