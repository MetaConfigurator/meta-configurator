import type {JsonSchemaType, SchemaPropertyType} from '@/model/JsonSchemaType';
import {
  nonBooleanSchema,
  schemaArray,
  schemaFromObject,
  schemaRecord,
} from '@/helpers/schema/SchemaUtils';
import type {Path, PathElement} from '@/model/path';
import {preprocessSchema} from '@/helpers/schema/schemaPreprocessor';
import {useSessionStore} from '@/store/sessionStore';
import {pathToString} from '@/helpers/pathHelper';
import type {OneOfAnyOfSelectionOption} from '@/model/OneOfAnyOfSelectionOption';
import type {ValidateFunction} from 'ajv/dist/2020';
import Ajv2020 from 'ajv/dist/2020';

/**
 * This is a wrapper class for a JSON schema. It provides some utility functions
 * and a more convenient interface for accessing the schema.
 * Especially, it provides a way to access the schema at a given path and
 * null-safe access to the schema's properties.
 *
 * @todo For the future we need to define how "allOf", "anyOf", "oneOf",
 *       "if", "then", "else" and other properties that can contain a schema are handled.
 */
export class JsonSchema {
  readonly jsonSchema?;
  private _additionalProperties?: JsonSchema;
  private _allOf?: JsonSchema[];
  private _anyOf?: JsonSchema[];
  private _oneOf?: JsonSchema[];
  private _not?: JsonSchema;
  private _items?: JsonSchema;
  private _contains?: JsonSchema;
  private _properties?: Record<string, JsonSchema>;
  private _patternProperties?: Record<string, JsonSchema>;
  private _dependentSchemas?: Record<string, JsonSchema>;
  private _propertyNames?: JsonSchema;
  private _prefixItems?: JsonSchema[];
  private _unevaluatedItems?: JsonSchema;
  private _unevaluatedProperties?: JsonSchema;
  private _if?: JsonSchema;
  private _then?: JsonSchema;
  private _else?: JsonSchema;
  private _contentSchema?: JsonSchema;
  private _validationFunction?: ValidateFunction;

  private _userSelectionOnOfAnyOf?: OneOfAnyOfSelectionOption;

  constructor(jsonSchema: JsonSchemaType) {
    this.jsonSchema = nonBooleanSchema(jsonSchema);
    if (this.jsonSchema !== undefined) {
      this.jsonSchema = preprocessSchema(this.jsonSchema);
    }
  }

  public get validationFunction(): ValidateFunction {
    if (this._validationFunction === undefined) {
      this._validationFunction = new Ajv2020().compile(this.jsonSchema ?? {not: 'true'});
    }
    return this._validationFunction;
  }

  /**
   * Validates the given data.
   * @param data the data to validate.
   * @return if the data is valid according to the schema.
   */
  public validate(data: unknown): boolean {
    if (this.jsonSchema === undefined) {
      return false;
    }
    return this.validationFunction(data);
  }

  /**
   * Returns an empty, initial value that matches the type of
   * the schema (this is NOT the default value).
   */
  public initialValue(): any {
    if (this.hasType('object')) {
      return {};
    }
    if (this.hasType('array')) {
      return [];
    }
    if (this.hasType('string')) {
      return '';
    }
    if (this.hasType('number') || this.hasType('integer')) {
      return 0;
    }
    if (this.hasType('boolean')) {
      return false;
    }
    // type null
    return null;
  }

  /**
   * Returns true, if the schema has the given type.
   * @param type The type to check for.
   */
  public hasType(type: SchemaPropertyType): boolean {
    return this.type?.includes(type) ?? false;
  }

  public isRequired(key: string): boolean {
    return this.required?.includes(key) ?? false;
  }

  public subSchemaAt(relativePath: Path): JsonSchema | undefined {
    if (relativePath.length === 0) {
      return this;
    }

    let schema: JsonSchema | undefined = this;
    for (const element of relativePath) {
      schema = schema.subSchema(element);
      if (schema === undefined) {
        return undefined;
      }
    }

    return schema;
  }

  /**
   * Returns the schema at the given property or item.
   * @param subElement The name of the property or the index of the item.
   * @returns The schema at the given property or item, or undefined, if there is none.
   */
  public subSchema(subElement: PathElement): JsonSchema | undefined {
    if (this.jsonSchema === undefined) {
      return undefined;
    }
    if (typeof subElement === 'string') {
      return this.resolveOneOfAnyOf().subProperty(subElement);
    }

    // subElement is a number
    return this.subItem(subElement)?.resolveOneOfAnyOf();
  }

  private subProperty(subElement: string): JsonSchema | undefined {
    if (this.jsonSchema === undefined) {
      return undefined;
    }
    if (this.properties !== undefined && subElement in this.properties) {
      return this.properties[subElement];
    }
    for (const pattern of Object.keys(this.patternProperties)) {
      if (subElement.match(pattern)) {
        return this.patternProperties[pattern];
      }
    }
    // todo: check how additionalProperties and unevaluatedProperties relate
    if (this.jsonSchema?.unevaluatedProperties !== undefined) {
      return this.unevaluatedProperties;
    }
    return this.additionalProperties;
  }

  private subItem(subElement: number): JsonSchema | undefined {
    if (this.jsonSchema === undefined) {
      return undefined;
    }
    if (this.prefixItems.length > subElement) {
      return this.prefixItems[subElement];
    }
    // todo: check how items and unevaluatedItems are related
    if (this.jsonSchema?.unevaluatedItems !== undefined) {
      return this.unevaluatedItems;
    }
    return this.items;
  }

  public resolveOneOfAnyOf() {
    const selectedOption = this.userSelectionOneOfAnyOf;
    if (this.oneOf.length > 0) {
      return this.oneOf[selectedOption?.index ?? 0];
    }
    if (this.anyOf.length > 0) {
      return this.anyOf[selectedOption?.index ?? 0];
    }
    return this;
  }

  get isAlwaysTrue(): boolean {
    return JSON.stringify(this.jsonSchema) === '{}';
  }

  get isAlwaysFalse(): boolean {
    return this.jsonSchema === undefined;
  }

  get userSelectionOneOfAnyOf(): OneOfAnyOfSelectionOption | undefined {
    return this._userSelectionOnOfAnyOf;
  }

  set userSelectionOneOfAnyOf(value) {
    this._userSelectionOnOfAnyOf = value;
  }

  /**
   * Returns true if it is a constant value, i.e. if it has a const keyword,
   * or if it has an enum keyword with only one value, or if it is of type null.
   */
  get isConstant(): boolean {
    return (
      this.jsonSchema?.const !== undefined ||
      (this.jsonSchema?.enum !== undefined && this.jsonSchema?.enum.length === 1) ||
      (this.hasType('null') && this.type?.length === 1)
    );
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-8.2.2
   */
  get $anchor(): string | undefined {
    return this.jsonSchema?.$anchor;
  }

  /**
   * This keyword reserves a location for comments from schema authors to readers or maintainers of the schema.
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-8.3
   */
  get $comment(): string | undefined {
    return this.jsonSchema?.$comment;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-8.2.2
   */
  get $dynamicAnchor(): string | undefined {
    return this.jsonSchema?.$dynamicAnchor;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-8.2.2
   */
  get $dynamicRef(): string | undefined {
    return this.jsonSchema?.$dynamicRef;
  }

  /**
   * The "$ref" keyword is an applicator that is used to reference a statically identified schema.
   * Its results are the results of the referenced schema.
   * @todo solve how to deal with $ref and $dynamicRef
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-8.2.3.1
   */
  get $ref(): string | undefined {
    return this.jsonSchema?.$ref;
  }

  /**
   * The value of "additionalProperties" MUST be a valid JSON Schema.
   *
   * The behavior of this keyword depends on the presence and annotation results of "properties" and
   * "patternProperties" within the same schema object. Validation with "additionalProperties" applies
   * only to the child values of instance names that do not appear in the annotation results of either
   * "properties" or "patternProperties".
   *
   * For all such properties, validation succeeds if the child instance validates against the
   * "additionalProperties" schema.
   * [...]
   * Omitting this keyword has the same assertion behavior as an empty schema.
   *
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.3.2.3
   */
  get additionalProperties(): JsonSchema {
    if (this._additionalProperties === undefined) {
      this._additionalProperties = new JsonSchema(this.jsonSchema?.additionalProperties ?? true);
    }
    return this._additionalProperties;
  }

  /**
   * This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.
   *
   * An instance validates successfully against this keyword if it validates successfully against all
   * schemas defined by this keyword's value.
   *
   * Here implemented in a way that it returns an empty array if the keyword is not present.
   *
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.2.1.1
   * @todo we have to this consider this keyword for basically all other keywords
   */
  get allOf(): JsonSchema[] {
    if (this._allOf === undefined) {
      this._allOf = schemaArray(this.jsonSchema?.allOf);
    }
    return this._allOf;
  }

  /**
   * This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.
   *
   * An instance validates successfully against this keyword if it validates successfully against at
   * least one schema defined by this keyword's value. Note that when annotations are being collected,
   * all subschemas MUST be examined so that annotations are collected from each subschema that
   * validates successfully.
   *
   * Here implemented in a way that it returns an empty array if the keyword is not present.
   *
   * @todo we have to this consider this keyword for basically all other keywords
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.2.1.2
   */
  get anyOf(): JsonSchema[] {
    if (this._anyOf === undefined) {
      this._anyOf = schemaArray(this.jsonSchema?.anyOf);
    }
    return this._anyOf;
  }

  /**
   * This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.
   *
   * An instance validates successfully against this keyword if it validates successfully against
   * exactly one schema defined by this keyword's value.
   *
   * @todo we have to this consider this keyword for basically all other keywords
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.2.1.3
   */
  get oneOf(): JsonSchema[] {
    if (this._oneOf === undefined) {
      this._oneOf = schemaArray(this.jsonSchema?.oneOf);
    }
    return this._oneOf;
  }

  /**
   * This keyword's value MUST be a valid JSON Schema.
   *
   * An instance is valid against this keyword if it fails to validate successfully against the
   * schema defined by this keyword.
   *
   * Should only be used for validation, not in the GUI.
   *
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.2.1.4
   */
  get not(): JsonSchema | undefined {
    if (this._not === undefined) {
      this._not = schemaFromObject(this.jsonSchema?.not);
    }
    return this._not;
  }

  /**
   * The value of this keyword MAY be of any type, including null.
   *
   * Use of this keyword is functionally equivalent to an "enum" (Section 6.1.2) with a single value.
   *
   * An instance validates successfully against this keyword if its value is equal to the value of the keyword.
   */
  get const(): any | undefined {
    return this.jsonSchema?.const;
  }

  /**
   * The value of this keyword MUST be a valid JSON Schema.
   *
   * An array instance is valid against "contains" if at least one of its elements is valid against
   * the given schema, except when "minContains" is present and has a value of 0, in which case an
   * array instance MUST be considered valid against the "contains" keyword, even if none of its
   * elements is valid against the given schema.
   *
   * Probably should be used for validation only, not in the GUI.
   *
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.3.1.3
   */
  get contains(): JsonSchema | undefined {
    if (this._contains === undefined) {
      this._contains = schemaFromObject(this.jsonSchema?.contains);
    }
    return this._contains;
  }

  /**
   * If the instance value is a string, this property defines that the string SHOULD be interpreted
   * as encoded binary data and decoded using the encoding named by this property.
   *
   * @see https://json-schema.org/draft/2020-12/json-schema-validation.html#section-8.3
   */
  get contentEncoding(): string | undefined {
    return this.jsonSchema?.contentEncoding;
  }

  /**
   * If the instance is a string, this property indicates the media type of the contents of the string.
   * If "contentEncoding" is present, this property describes the decoded string.
   *
   * @see https://json-schema.org/draft/2020-12/json-schema-validation.html#section-8.4
   */
  get contentMediaType(): string | undefined {
    return this.jsonSchema?.contentMediaType;
  }

  /**
   * If the instance is a string, and if "contentMediaType" is present, this property contains a
   * schema which describes the structure of the string.
   *
   * This keyword MAY be used with any media type that can be mapped into JSON Schema's data model.
   *
   * The value of this property MUST be a valid JSON schema. It SHOULD be ignored if
   * "contentMediaType" is not present.
   */
  get contentSchema(): JsonSchema | undefined {
    if (this._contentSchema === undefined) {
      this._contentSchema = schemaFromObject(this.jsonSchema?.contentSchema);
    }
    return this._contentSchema;
  }

  /**
   * There are no restrictions placed on the value of this keyword. When multiple occurrences of
   * this keyword are applicable to a single sub-instance, implementations SHOULD remove duplicates.
   *
   * This keyword can be used to supply a default JSON value associated with a particular schema.
   * It is RECOMMENDED that a default value be valid against the associated schema.
   */
  get default(): any | undefined {
    return this.jsonSchema?.default;
  }

  /**
   * The value of this keyword MUST be an object. Properties in this object, if any, MUST be arrays.
   * Elements in each array, if any, MUST be strings, and MUST be unique.
   *
   * This keyword specifies properties that are required if a specific other property is present.
   * Their requirement is dependent on the presence of the other property.
   *
   * Validation succeeds if, for each name that appears in both the instance and as a name within
   * this keyword's value, every item in the corresponding array is also the name of a property in the instance.
   *
   * Omitting this keyword has the same behavior as an empty object.
   *
   * @todo to properly support this, we need to calculate an effective schema depending on the
   *      presence of other properties in the data.
   */
  get dependentRequired(): {[k: string]: string[]} {
    // TODO maybe also consider deprecated "dependencies" keyword
    return this.jsonSchema?.dependentRequired ?? {};
  }

  /**
   * This keyword specifies subschemas that are evaluated if the instance is an object and contains a certain property.
   *
   * This keyword's value MUST be an object. Each value in the object MUST be a valid JSON Schema.
   *
   * If the object key is a property in the instance, the entire instance must validate against the subschema.
   * Its use is dependent on the presence of the property.
   *
   * Omitting this keyword has the same behavior as an empty object.
   *
   * @todo to properly support this, we need to calculate an effective schema depending on the
   *      presence of other properties in the data.
   */
  get dependentSchemas(): Record<string, JsonSchema> {
    if (this._dependentSchemas === undefined) {
      this._dependentSchemas = schemaRecord(this.jsonSchema?.dependentSchemas);
    }
    return this._dependentSchemas;
  }

  /**
   * The value of this keyword MUST be a boolean. When multiple occurrences of this keyword are
   * applicable to a single sub-instance, applications SHOULD consider the instance location to be
   * deprecated if any occurrence specifies a true value.
   * [...]
   * Omitting this keyword has the same behavior as a value of false.
   */
  get deprecated(): boolean {
    return this.jsonSchema?.deprecated ?? false;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-validation.html#name-title-and-description
   * @return {string} the description of this schema, or an empty string if not defined
   */
  get description(): string {
    return this.jsonSchema?.description ?? '';
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.2.2
   */
  get else(): JsonSchema | undefined {
    if (this._else === undefined) {
      this._else = schemaFromObject(this.jsonSchema?.else);
    }
    return this._else;
  }

  /**
   * The value of this keyword MUST be an array. This array SHOULD have at least one element.
   * Elements in the array SHOULD be unique.
   *
   * An instance validates successfully against this keyword if its value is equal to one of the elements
   * in this keyword's array value.
   *
   * Elements in the array might be of any type, including null.
   */
  get enum(): any[] | undefined {
    return this.jsonSchema?.enum;
  }

  /**
   * The value of this keyword MUST be an array. There are no restrictions placed on the values within the array.
   * When multiple occurrences of this keyword are applicable to a single sub-instance,
   * implementations MUST provide a flat array of all values rather than an array of arrays.
   *
   * This keyword can be used to provide sample JSON values associated with a particular schema,
   * for the purpose of illustrating usage. It is RECOMMENDED that these values be valid against the associated schema.
   *
   * Implementations MAY use the value(s) of "default", if present, as an additional example.
   * If "examples" is absent, "default" MAY still be used in this manner.
   */
  get examples(): any[] {
    return this.jsonSchema?.examples ?? [];
  }

  /**
   * The value of "exclusiveMaximum" MUST be a number, representing an exclusive upper limit for a numeric instance.
   *
   * If the instance is a number, then the instance is valid only if it has a value strictly less
   * than (not equal to) "exclusiveMaximum".
   */
  get exclusiveMaximum(): number | undefined {
    return this.jsonSchema?.exclusiveMaximum;
  }

  /**
   * The value of "exclusiveMinimum" MUST be a number, representing an exclusive lower limit for a numeric instance.
   *
   * If the instance is a number, then the instance is valid only if it has a value strictly greater
   * than (not equal to) "exclusiveMinimum".
   */
  get exclusiveMinimum(): number | undefined {
    return this.jsonSchema?.exclusiveMinimum;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-validation.html#section-7
   */
  get format(): string | undefined {
    return this.jsonSchema?.format;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.2.2
   */
  get if(): JsonSchema | undefined {
    if (this._if === undefined) {
      this._if = schemaFromObject(this.jsonSchema?.if);
    }
    return this._if;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.3.1.2
   */
  get items(): JsonSchema {
    if (this._items === undefined) {
      this._items = schemaFromObject(this.jsonSchema?.items ?? true) as JsonSchema;
    }
    return this._items;
  }

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * If "contains" is not present within the same schema object, then this keyword has no effect.
   *
   * An instance array is valid against "maxContains" in two ways, depending on the form of
   * the annotation result of an adjacent "contains" [json-schema] keyword.
   * The first way is if the annotation result is an array and the length of that array is less
   * than or equal to the "maxContains" value. The second way is if the annotation result is a
   * boolean "true" and the instance array length is less than or equal to the "maxContains" value.
   */
  get maxContains(): number | undefined {
    return this.jsonSchema?.maxContains;
  }

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An array instance is valid against "maxItems" if its size is less than, or equal to, the value of this keyword.
   */
  get maxItems(): number | undefined {
    return this.jsonSchema?.maxItems;
  }

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * A string instance is valid against this keyword if its length is less than, or equal to,
   * the value of this keyword.
   */
  get maxLength(): number | undefined {
    return this.jsonSchema?.maxLength;
  }

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An object instance is valid against "maxProperties" if its number of properties is less than,
   * or equal to, the value of this keyword.
   */
  get maxProperties(): number | undefined {
    return this.jsonSchema?.maxProperties;
  }

  /**
   * The value of "maximum" MUST be a number, representing an inclusive upper limit for a numeric instance.
   *
   * If the instance is a number, then this keyword validates only if the instance is less than or
   * exactly equal to "maximum".
   */
  get maximum(): number | undefined {
    return this.jsonSchema?.maximum;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-validation.html#section-6.4.5
   */
  get minContains(): number {
    return this.jsonSchema?.minContains ?? 1;
  }

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An array instance is valid against "minItems" if its size is greater than, or equal to, the value of this keyword.
   *
   * Omitting this keyword has the same behavior as a value of 0.
   */
  get minItems(): number {
    return this.jsonSchema?.minItems ?? 0;
  }

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * A string instance is valid against this keyword if its length is greater than
   * , or equal to, the value of this keyword.
   */
  get minLength(): number {
    return this.jsonSchema?.minLength ?? 0;
  }

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An object instance is valid against "minProperties" if its number of properties is greater than,
   * or equal to, the value of this keyword.
   *
   * Omitting this keyword has the same behavior as a value of 0.
   */
  get minProperties(): number {
    return this.jsonSchema?.minProperties ?? 0;
  }

  /**
   * The value of "minimum" MUST be a number, representing an inclusive lower limit for a numeric instance.
   *
   * If the instance is a number, then this keyword validates only if the instance is greater than or exactly
   * equal to "minimum".
   */
  get minimum(): number | undefined {
    return this.jsonSchema?.minimum;
  }

  /**
   * The value of "multipleOf" MUST be a number, strictly greater than 0.
   *
   * A numeric instance is valid only if division by this keyword's value results in an integer.
   */
  get multipleOf(): number | undefined {
    return this.jsonSchema?.multipleOf;
  }

  /**
   * The value of this keyword MUST be a string. This string SHOULD be a valid regular expression,
   * according to the ECMA-262 regular expression dialect.
   *
   * A string instance is considered valid if the regular expression matches the instance successfully.
   * Recall: regular expressions are not implicitly anchored.
   */
  get pattern(): string | undefined {
    return this.jsonSchema?.pattern;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.3.2.2
   */
  get patternProperties(): Record<string, JsonSchema> {
    if (this._patternProperties === undefined) {
      this._patternProperties = schemaRecord(this.jsonSchema?.patternProperties);
    }
    return this._patternProperties;
  }

  /**
   * For tuples.
   *
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#name-prefixitems
   */
  get prefixItems(): JsonSchema[] {
    if (this._prefixItems === undefined) {
      this._prefixItems = schemaArray(this.jsonSchema?.prefixItems);
    }
    return this._prefixItems;
  }

  get properties(): Record<string, JsonSchema> {
    if (this._properties === undefined) {
      this._properties = schemaRecord(this.jsonSchema?.properties);
    }
    return this._properties;
  }

  get propertyNames(): JsonSchema {
    if (this._propertyNames === undefined) {
      this._propertyNames = schemaFromObject(this.jsonSchema?.propertyNames ?? true) as JsonSchema;
    }
    return this._propertyNames;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-validation.html#name-readonly-and-writeonly
   */
  get readOnly(): boolean {
    return this.jsonSchema?.readOnly ?? false;
  }

  /**
   * Returns the list of required properties.
   */
  get required(): string[] {
    return this.jsonSchema?.required ?? [];
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-10.2.2
   */
  get then(): JsonSchema | undefined {
    if (this._then === undefined) {
      this._then = schemaFromObject(this.jsonSchema?.then);
    }
    return this._then;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-validation.html#name-title-and-description
   * @return {string} the title of this schema
   */
  get title(): string | undefined {
    return this.jsonSchema?.title;
  }

  /**
   * The value of this keyword MUST be either a string or an array. If it is an array, elements of
   * the array MUST be strings and MUST be unique.
   *
   * String values MUST be one of the six primitive types ("null", "boolean", "object", "array",
   * "number", or "string"), or "integer" which matches any number with a zero fractional part.
   *
   * If the value of "type" is a string, then an instance validates successfully if its type
   * matches the type represented by the value of the string. If the value of "type" is an array,
   * then an instance validates successfully if its type matches any of the types indicated by the
   * strings in the array.
   *
   * Here implemented as a string array for convenience.
   */
  get type(): SchemaPropertyType[] {
    if (typeof this.jsonSchema?.type === 'string') {
      return [this.jsonSchema.type];
    }
    return (
      this.jsonSchema?.type ?? ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']
    );
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-11.2
   */
  get unevaluatedItems(): JsonSchema {
    if (this._unevaluatedItems === undefined) {
      this._unevaluatedItems = schemaFromObject(
        this.jsonSchema?.unevaluatedItems ?? true
      ) as JsonSchema;
    }
    return this._unevaluatedItems;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-core.html#section-11.3
   */
  get unevaluatedProperties(): JsonSchema {
    if (this._unevaluatedProperties === undefined) {
      this._unevaluatedProperties = schemaFromObject(
        this.jsonSchema?.unevaluatedProperties ?? true
      ) as JsonSchema;
    }
    return this._unevaluatedProperties;
  }

  /**
   * The value of this keyword MUST be a boolean.
   *
   * If this keyword has boolean value false, the instance validates successfully.
   * If it has boolean value true, the instance validates successfully if all of its elements are unique.
   *
   * Omitting this keyword has the same behavior as a value of false.
   */
  get uniqueItems(): boolean {
    return this.jsonSchema?.uniqueItems ?? false;
  }

  /**
   * @see https://json-schema.org/draft/2020-12/json-schema-validation.html#name-readonly-and-writeonly
   */
  get writeOnly(): boolean {
    return this.jsonSchema?.writeOnly ?? false;
  }
}
