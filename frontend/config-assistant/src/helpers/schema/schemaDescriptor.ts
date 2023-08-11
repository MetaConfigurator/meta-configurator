import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {SchemaPropertyType} from '@/model/JsonSchemaType';
import {NUMBER_OF_PROPERTY_TYPES} from '@/model/JsonSchemaType';

/**
 * Creates an HTML paragraph describing the given schema.
 *
 * The following properties are not described yet:
 * - $schema
 * - $id
 * - $vocabulary
 * - $defs
 * - definitions
 * - $recursiveAnchor
 * - $recursiveRef
 * - contentEncoding
 * - contentMediaType
 * - contentSchema
 * - dependencies
 * - dependentRequired
 * - readOnly
 * - writeOnly
 * - maxProperties
 * - minProperties
 * - $ref
 * - $dynamicRef
 * - $dynamicAnchor
 * - unevaluatedProperties
 * - unevaluatedItems
 * - if
 * - then
 * - else
 * - prefixItems
 *
 * @param schema the schema to describe
 * @param propertyName the name of the property the schema belongs to
 * @param parentSchema the schema of the parent object
 * @param deep whether to describe the schema in detail (used for recursive calls)
 * @param indentation the indentation level (used for recursive calls)
 */
export function describeSchema(
  schema: JsonSchema,
  propertyName?: string,
  parentSchema?: JsonSchema,
  deep: boolean = false,
  indentation = 0
): string {
  if (schema.isAlwaysTrue) {
    return paragraph(`This schema is ${bold('always')} valid.`);
  }
  if (schema.isAlwaysFalse) {
    return paragraph(`This schema is ${bold('never')} valid.`);
  }
  return describeObjectSchema(schema, propertyName, parentSchema, deep, indentation);
}

function describeObjectSchema(
  schema: JsonSchema,
  propertyName?: string,
  parentSchema?: JsonSchema,
  deep: boolean = false,
  indentation = 0
): string {
  let result = '';
  if (deep) {
    result = describeTitle(schema) + describeDescription(schema);
  }

  if (!isBlank(result)) {
    result = `${result}${paragraph('<br>')}`;
  }

  result =
    `${result}` +
    describeRequired(propertyName, parentSchema) +
    describeType(schema) +
    describeExamples(schema) +
    describeDefault(schema) +
    describeDeprecated(schema) +
    describeConst(schema) +
    describeEnum(schema) +
    describeMinimumAndMaximum(schema) +
    describeMultipleOf(schema) +
    describeStringLength(schema) +
    describeFormatAndPattern(schema) +
    describeRequiredProperties(schema) +
    describeProperties(schema);

  if (deep) {
    result +=
      describePatternProperties(schema) +
      describeAdditionalProperties(schema) +
      describePropertyNames(schema) +
      describeItems(schema) +
      describeContains(schema) +
      describeAllOf(schema) +
      describeAnyOf(schema) +
      describeOneOf(schema) +
      describeNot(schema) +
      describeComment(schema);
  }

  if (isBlank(result)) {
    return '';
  }

  if (indentation > 0) {
    return `<div style="margin-left: ${indentation * 2}rem; display: inline-list-item">
                  ${result}
              </div>`;
  }

  return `<div>${result}</div>`;
}

function describeRequired(propertyName?: string, parentSchema?: JsonSchema): string {
  if (!propertyName) {
    return '';
  }
  if (
    !parentSchema ||
    typeof parentSchema !== 'object' ||
    !parentSchema.required ||
    !parentSchema.required.includes(propertyName)
  ) {
    return paragraph(`This property is optional.`);
  }
  return paragraph(`This property is ${bold('required')}.`);
}

function describeType(schema: JsonSchema) {
  if (schema.type.length === NUMBER_OF_PROPERTY_TYPES) {
    return '';
  }
  if (schema.type) {
    return paragraph(`The value must be ${formatType(schema.type)}.`);
  }
  return '';
}

function describeTitle(schema: JsonSchema): string {
  if (schema.title) {
    return paragraph(bold(schema.title));
  }
  return '';
}

function describeRequiredProperties(schema: JsonSchema): string {
  if (schema.required && schema.required.length > 0) {
    return paragraph(`The following properties are ${bold('required')}: 
          ${ul(schema.required.map(p => formatValue(p)))}`);
  }
  return '';
}

function describeProperties(schema: JsonSchema): string {
  if (schema.properties) {
    const optionalProperties = schema.required
      ? Object.keys(schema.properties).filter(p => !schema.required?.includes(p))
      : Object.keys(schema.properties);
    if (optionalProperties.length > 0) {
      return paragraph(`The following properties are optional: 
              ${ul(optionalProperties.map(p => formatValue(p)))}`);
    }
  }
  return '';
}

function describePropertyNames(schema: JsonSchema): string {
  if (schema.hasType('object') && schema.propertyNames && !schema.propertyNames.isAlwaysTrue) {
    return paragraph(
      `The ${bold('property names')} must match the following schema: ${describeSubSchema(
        schema.propertyNames
      )}`
    );
  }
  return '';
}

function describePatternProperties(schema: JsonSchema): string {
  if (schema.patternProperties) {
    let result = '';
    for (const [pattern, patternSchema] of Object.entries(schema.patternProperties)) {
      result +=
        `If the property name matches the pattern ${formatValue(pattern)}, ` +
        `the following schema must be fulfilled: ${describeSubSchema(
          patternSchema,
          undefined,
          schema
        )}`;
    }
    if (isBlank(result)) {
      return '';
    }
    return paragraph(result);
  }
  return '';
}

function describeMultipleOf(schema: JsonSchema): string {
  if (schema.multipleOf) {
    return paragraph(
      `The value must be ${bold('divisible')} by ${formatValue(schema.multipleOf)}.`
    );
  }
  return '';
}

function describeItems(schema: JsonSchema): string {
  if (schema.hasType('array') && schema.items && !schema.items.isAlwaysTrue) {
    const minItems = schema.minItems ?? 0;
    const maxItems = schema.maxItems;
    const uniqueItems = schema.uniqueItems;
    const items = schema.items;

    let result = `The array must contain`;
    if (minItems) {
      result += ` ${bold('at least')} ${formatValue(minItems)}`;
    }
    if (minItems && maxItems) {
      result += ' and';
    }
    if (maxItems) {
      result += ` ${bold('at most')} ${formatValue(maxItems)}`;
    }
    if (uniqueItems) {
      result += ' ' + bold('unique');
    }
    result += ' items ';
    if (typeof schema.items === 'object' && schema.items.type && schema.items.type.length > 0) {
      result += formatType(schema.items.type) + ' ';
    }

    result += 'that match the following schema: ';
    result += describeSubSchema(items, undefined, schema);
    return paragraph(result);
  }
  return '';
}

function describeStringLength(schema: JsonSchema): string {
  const min = schema.minLength;
  const max = schema.maxLength;

  if (!min && max === undefined) {
    return '';
  }

  let result = 'The string must be ';
  if (min !== undefined) {
    result += bold(`at least `) + formatValue(min);
  }
  if (min !== undefined && max !== undefined) {
    result += ' and ';
  }
  if (max !== undefined) {
    result += bold(`at most `) + formatValue(max);
  }
  result += ' characters long.';

  return paragraph(result);
}

function describeMinimumAndMaximum(schema: JsonSchema): string {
  const min = schema.minimum;
  const max = schema.maximum;
  const exclusiveMin = schema.exclusiveMinimum;
  const exclusiveMax = schema.exclusiveMaximum;

  if (
    min === undefined &&
    max === undefined &&
    exclusiveMin === undefined &&
    exclusiveMax === undefined
  ) {
    return '';
  }

  let result = 'The value must be ';
  if (min !== undefined && exclusiveMin === undefined) {
    result += bold(`greater than `) + formatValue(min);
  } else if (exclusiveMin !== undefined) {
    result += bold(`at least `) + formatValue(exclusiveMin);
  }

  if (
    (min !== undefined || exclusiveMin !== undefined) &&
    (max !== undefined || exclusiveMax !== undefined)
  ) {
    result += ' and ';
  }

  if (max !== undefined && exclusiveMax === undefined) {
    result += bold(`less than `) + formatValue(max);
  } else if (exclusiveMax !== undefined) {
    result += bold(`at most `) + formatValue(exclusiveMax);
  }

  return paragraph(result + '.');
}

function describeExamples(schema: JsonSchema): string {
  if (schema.examples.length > 0) {
    return `Examples: ${ul(schema.examples.map(e => formatValue(e)))}`;
  }
  return '';
}

function describeEnum(schema: JsonSchema): string {
  if (schema.enum && schema.enum.length > 0) {
    return `The value must be one of the following:` + ul(schema.enum.map(e => formatValue(e)));
  }
  return '';
}

function describeDescription(schema: JsonSchema): string {
  if (schema.description) {
    return paragraph(italic(schema.description));
  }
  return '';
}

function describeDeprecated(schema: JsonSchema): string {
  if (schema.deprecated) {
    return paragraph(bold('Deprecated.'));
  }
  return '';
}

function describeDefault(schema: JsonSchema): string {
  if (schema.default) {
    const defaultString = JSON.stringify(schema.default);
    if (!isBlank(defaultString)) {
      return paragraph(`The default value is ${formatValue(schema.default)}.`);
    }
  }
  return '';
}

function describeContains(schema: JsonSchema): string {
  if (schema.contains) {
    const min = schema.minContains ?? 1;
    const max = schema.maxContains;

    const result = `The array must contain at least ${formatValue(min)}`;
    if (max) {
      return paragraph(`${result} and ${bold('at most')} ${formatValue(max)}`);
    }
    return paragraph(
      `${result} items that match the following schema: ${describeSubSchema(
        schema.contains,
        undefined,
        schema
      )}`
    );
  }
  return '';
}

function describeConst(schema: JsonSchema): string {
  if (schema.const) {
    return paragraph(`The value must be ${formatValue(schema.const)}.`);
  }
  return '';
}

function describeNot(schema: JsonSchema): string {
  if (schema.not) {
    return `The following schema must ${bold('not')} be fulfilled: <br> ${describeSubSchema(
      schema.not,
      undefined,
      schema
    )}`;
  }
  return '';
}

function describeAllOf(schema: JsonSchema): string {
  if (schema.allOf && schema.allOf.length > 0) {
    return 'All of the following schemas must be fulfilled: ' + schemaDescriptionList(schema.allOf);
  }
  return '';
}

function describeAnyOf(schema: JsonSchema): string {
  if (schema.anyOf && schema.anyOf.length > 0) {
    return (
      'At least one of the following schemas must be fulfilled: ' +
      schemaDescriptionList(schema.anyOf)
    );
  }
  return '';
}

function describeOneOf(schema: JsonSchema): string {
  if (schema.oneOf && schema.oneOf.length > 0) {
    return (
      'Exactly one of the following schemas must be fulfilled: ' +
      schemaDescriptionList(schema.oneOf)
    );
  }
  return '';
}

function describeAdditionalProperties(schema: JsonSchema): string {
  if (!schema.hasType('object') || schema.additionalProperties?.isAlwaysTrue === true) {
    return '';
  }
  if (schema.additionalProperties === undefined || schema.additionalProperties.isAlwaysTrue) {
    return paragraph(`Any additional properties are allowed.`);
  }
  if (schema.additionalProperties.isAlwaysFalse) {
    return paragraph(`${bold('No additional properties')} are allowed.`);
  }
  return paragraph(
    `Additional properties must match the following schema: ${describeSubSchema(
      schema.additionalProperties,
      undefined,
      schema
    )}`
  );
}

function describeComment(schema: JsonSchema): string {
  if (schema.$comment && !isBlank(schema.$comment)) {
    return paragraph(`${italic(schema.$comment)}`);
  }
  return '';
}

function describeFormatAndPattern(schema: JsonSchema): string {
  if (schema.format) {
    switch (schema.format) {
      case 'date-time':
        return paragraph(`The value must be a date and time in the format YYYY-MM-DDThh:mm:ssZ.`);
      case 'date':
        return paragraph(`The value must be a date in the format YYYY-MM-DD.`);
      case 'time':
        return paragraph(`The value must be a time in the format hh:mm:ss.`);
      case 'email':
        return paragraph(`The value must be an email address.`);
      case 'idn-email':
        return paragraph(`The value must be an email address.`);
      case 'hostname':
        return paragraph(`The value must be a hostname.`);
      case 'idn-hostname':
        return paragraph(`The value must be a hostname.`);
      case 'ipv4':
        return paragraph(`The value must be an IPv4 address.`);
      case 'ipv6':
        return paragraph(`The value must be an IPv6 address.`);
      case 'uri':
        return paragraph(`The value must be a URI.`);
      case 'uri-reference':
        return paragraph(`The value must be a URI reference.`);
      case 'iri':
        return paragraph(`The value must be an IRI.`);
      case 'iri-reference':
        return paragraph(`The value must be an IRI reference.`);
      case 'uri-template':
        return paragraph(`The value must be a URI template.`);
      case 'json-pointer':
        return paragraph(`The value must be a JSON pointer.`);
      case 'relative-json-pointer':
        return paragraph(`The value must be a relative JSON pointer.`);
      case 'regex':
        return paragraph(`The value must be a regular expression.`);
      default:
        return paragraph(`The value must be a ${schema.format}.`);
    }
  }
  if (schema.pattern) {
    return paragraph(`The value must match the following pattern: ${formatValue(schema.pattern)}`);
  }
  return '';
}

function formatType(type: SchemaPropertyType[]): string {
  if (type.length === 1) {
    return 'of type ' + formatValue(type[0]);
  }
  if (type.length === 2) {
    return `of type ${formatValue(type[0])} or ${formatValue(type[1])}`;
  }
  if (type.length === NUMBER_OF_PROPERTY_TYPES) {
    return 'of any type';
  }
  return `of one of the following types: ${type.map(t => formatValue(t)).join(', ')}`;
}

function paragraph(text: any) {
  return `<p>${text}</p>`;
}

function ul(elements: any[]) {
  return `<ul class='list-disc list-inside'>${elements.map(e => `<li>${e}</li>`).join('')}</ul>`;
}

function formatValue(value: any): string {
  const formattedValue = typeof value === 'string' ? value : JSON.stringify(value);
  return `<span class='font-mono text-violet-700 whitespace-nowrap'>${formattedValue}</span>`;
}

function schemaDescriptionList(schemas: JsonSchema[]): string {
  return ul(schemas.map(s => describeSubSchema(s, undefined, undefined)));
}

function describeSubSchema(schema: JsonSchema, key?: string, parentSchema?: JsonSchema): string {
  let result = describeSchema(schema, key, parentSchema, false, 1);
  if (isBlank(result)) {
    result = describeSchema(schema, key, parentSchema, true, 1);
  }
  if (isBlank(result)) {
    result = `<div style="margin-left: 2rem;">
                 There are no constraints on this property.
              </div>`;
  }
  return result;
}

function bold(text: any) {
  return `<b class='font-bold'>${text}</b>`;
}

function italic(text: any) {
  return `<i class='italic'>${text}</i>`;
}

function isBlank(str: string) {
  return !str || /^\s*$/.test(str);
}
