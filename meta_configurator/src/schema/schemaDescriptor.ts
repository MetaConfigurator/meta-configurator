import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {SchemaPropertyType} from '@/schema/jsonSchemaType';
import {NUMBER_OF_PROPERTY_TYPES} from '@/schema/jsonSchemaType';
import type {ErrorObject} from 'ajv';

export enum OutputFormat {
  HTML = 'html',
  Markdown = 'markdown',
}

/**
 * Creates an HTML paragraph describing the given schema.
 * Used in the schema tooltip.
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
 * @param validationErrors optional validation errors to display
 * @param outputFormat specifies the output format, either HTML or Markdown
 */
export function describeSchema(
  schema: JsonSchemaWrapper,
  propertyName?: string,
  parentSchema?: JsonSchemaWrapper,
  deep: boolean = false,
  indentation = 0,
  validationErrors: ErrorObject[] = [],
  outputFormat: OutputFormat = OutputFormat.HTML
): string {
  if (schema.isAlwaysTrue) {
    return paragraph(`This schema is ${bold('always', outputFormat)} valid.`, outputFormat);
  }
  if (schema.isAlwaysFalse) {
    return paragraph(`This schema is ${bold('never', outputFormat)} valid.`, outputFormat);
  }
  return describeObjectSchema(
    schema,
    propertyName,
    parentSchema,
    deep,
    indentation,
    validationErrors
  );
}

function describeObjectSchema(
  schema: JsonSchemaWrapper,
  propertyName?: string,
  parentSchema?: JsonSchemaWrapper,
  deep: boolean = false,
  indentation = 0,
  validationErrors: ErrorObject[] = [],
  outputFormat: OutputFormat = OutputFormat.HTML
): string {
  let result = '';
  if (deep) {
    result = describeTitle(schema, outputFormat) + describeDescription(schema, outputFormat);
  }

  if (!isBlank(result)) {
    result = `${result}${paragraph(newLine(outputFormat), outputFormat)}`;
  }

  result =
    `${result}` +
    describeRequired(outputFormat, propertyName, parentSchema) +
    describeType(schema, validationErrors, outputFormat) +
    describeExamples(schema, outputFormat) +
    describeDefault(schema, outputFormat) +
    describeDeprecated(schema, outputFormat) +
    describeConst(schema, validationErrors, outputFormat) +
    describeEnum(schema, validationErrors, outputFormat) +
    describeMinimumAndMaximum(schema, validationErrors, outputFormat) +
    describeMultipleOf(schema, validationErrors, outputFormat) +
    describeStringLength(schema, validationErrors, outputFormat) +
    describeFormatAndPattern(schema, validationErrors, outputFormat) +
    describeRequiredProperties(schema, validationErrors, outputFormat) +
    describeProperties(schema, outputFormat);

  if (deep) {
    result +=
      describePatternProperties(schema, outputFormat) +
      describeAdditionalProperties(schema, validationErrors, outputFormat) +
      describePropertyNames(schema, validationErrors, outputFormat) +
      describeItems(schema, validationErrors, outputFormat) +
      describeContains(schema, validationErrors, outputFormat) +
      describeAllOf(schema, outputFormat) +
      describeAnyOf(schema, validationErrors, outputFormat) +
      describeOneOf(schema, validationErrors, outputFormat) +
      describeNot(schema, validationErrors, outputFormat) +
      describeComment(schema, outputFormat);

    if (validationErrors.length > 0) {
      result += newLine(outputFormat);
      result += describeSchemaValidationErrors(validationErrors, outputFormat);
    }
  }

  if (isBlank(result)) {
    return '';
  }

  if (indentation > 0) {
    return div(result, outputFormat, indentation, true);
  }

  return div(result, outputFormat, undefined, false);
}

function describeRequired(
  outputFormat: OutputFormat,
  propertyName?: string,
  parentSchema?: JsonSchemaWrapper
): string {
  if (!propertyName) {
    return '';
  }
  if (
    !parentSchema ||
    typeof parentSchema !== 'object' ||
    !parentSchema.required ||
    !parentSchema.required.includes(propertyName)
  ) {
    return paragraph(`This property is optional.`, outputFormat);
  }
  return paragraph(`This property is ${bold('required', outputFormat)}.`, outputFormat);
}

function describeType(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.type.length === NUMBER_OF_PROPERTY_TYPES) {
    return '';
  }
  if (schema.type) {
    const type =
      'The value must be ' +
      formatAsErrorIfInvalid(formatType(schema.type), 'type', validationErrors);
    return paragraph(type, outputFormat);
  }
  return '';
}

function describeTitle(schema: JsonSchemaWrapper, outputFormat: OutputFormat): string {
  if (schema.title) {
    return paragraph(bold(schema.title, outputFormat), outputFormat);
  }
  return '';
}

function describeRequiredProperties(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.required && schema.required.length > 0) {
    return paragraph(
      `The following properties are ${formatAsErrorIfInvalid(
        bold('required', outputFormat),
        'required',
        validationErrors
      )}: 
          ${ul(
            schema.required.map(p => formatValue(p)),
            outputFormat
          )}`,
      outputFormat
    );
  }
  return '';
}

function describeProperties(schema: JsonSchemaWrapper, outputFormat: OutputFormat): string {
  if (schema.properties) {
    const optionalProperties = schema.required
      ? Object.keys(schema.properties).filter(p => !schema.required?.includes(p))
      : Object.keys(schema.properties);
    if (optionalProperties.length > 0) {
      return paragraph(
        `The following properties are optional: 
              ${ul(
                optionalProperties.map(p => formatValue(p)),
                outputFormat
              )}`,
        outputFormat
      );
    }
  }
  return '';
}

function describePropertyNames(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.hasType('object') && schema.propertyNames && !schema.propertyNames.isAlwaysTrue) {
    return paragraph(
      `The ${formatAsErrorIfInvalid(
        bold('property names', outputFormat),
        'propertyNames',
        validationErrors
      )} 
      must match the following schema: ${describeSubSchema(schema.propertyNames)}`,
      outputFormat
    );
  }
  return '';
}

function describePatternProperties(schema: JsonSchemaWrapper, outputFormat: OutputFormat): string {
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
    return paragraph(result, outputFormat);
  }
  return '';
}

function describeMultipleOf(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.multipleOf) {
    const multipleOf = `The value must be ${formatAsErrorIfInvalid(
      bold('divisible', outputFormat) + ' by ' + formatValue(schema.multipleOf),
      'multipleOf',
      validationErrors
    )}.`;
    return paragraph(multipleOf, outputFormat);
  }
  return '';
}

function describeItems(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.hasType('array') && schema.items && !schema.items.isAlwaysTrue) {
    const minItems = schema.minItems ?? 0;
    const maxItems = schema.maxItems;
    const uniqueItems = schema.uniqueItems;
    const items = schema.items;

    let result = `The array must contain`;
    if (minItems) {
      const atLeast = ` ${bold('at least', outputFormat)} ${formatValue(minItems)}`;
      result += formatAsErrorIfInvalid(atLeast, 'minItems', validationErrors);
    }
    if (minItems && maxItems) {
      result += ' and';
    }
    if (maxItems) {
      const atMost = ` ${bold('at most', outputFormat)} ${formatValue(maxItems)}`;
      result += formatAsErrorIfInvalid(atMost, 'maxItems', validationErrors);
    }
    if (uniqueItems) {
      result +=
        ' ' + formatAsErrorIfInvalid(bold('unique', outputFormat), 'uniqueItems', validationErrors);
    }
    result += ' items ';
    if (typeof schema.items === 'object' && schema.items.type && schema.items.type.length > 0) {
      result += formatType(schema.items.type) + ' ';
    }

    result += 'that match the following schema: ';
    const subschema = describeSubSchema(items, undefined, schema);
    result += formatAsErrorIfInvalid(subschema, 'items', validationErrors);
    return paragraph(result, outputFormat);
  }
  return '';
}

function describeStringLength(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  const min = schema.minLength;
  const max = schema.maxLength;

  if (!min && max === undefined) {
    return '';
  }

  let result = 'The string must be ';
  if (min !== undefined) {
    result += formatAsErrorIfInvalid(
      bold(`at least `, outputFormat) + formatValue(min),
      'minLength',
      validationErrors
    );
  }
  if (min !== undefined && max !== undefined) {
    result += ' and ';
  }
  if (max !== undefined) {
    result += formatAsErrorIfInvalid(
      bold(`at most `, outputFormat) + formatValue(max),
      'maxLength',
      validationErrors
    );
  }
  result += ' characters long.';

  return paragraph(result, outputFormat);
}

function describeMinimumAndMaximum(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
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
    result += formatAsErrorIfInvalid(
      bold(`at least `, outputFormat) + formatValue(min),
      'minimum',
      validationErrors
    );
  } else if (exclusiveMin !== undefined) {
    result += formatAsErrorIfInvalid(
      bold(`greater than `, outputFormat) + formatValue(exclusiveMin),
      'exclusiveMinimum',
      validationErrors
    );
  }

  if (
    (min !== undefined || exclusiveMin !== undefined) &&
    (max !== undefined || exclusiveMax !== undefined)
  ) {
    result += ' and ';
  }

  if (max !== undefined && exclusiveMax === undefined) {
    result += formatAsErrorIfInvalid(
      bold(`at most `, outputFormat) + formatValue(max),
      'maximum',
      validationErrors
    );
  } else if (exclusiveMax !== undefined) {
    result += formatAsErrorIfInvalid(
      bold(`less than `, outputFormat) + formatValue(exclusiveMax),
      'exclusiveMaximum',
      validationErrors
    );
  }

  return paragraph(result + '.', outputFormat);
}

function describeExamples(schema: JsonSchemaWrapper, outputFormat: OutputFormat): string {
  if (schema.examples.length > 0) {
    return `Examples: ${ul(
      schema.examples.map(e => formatValue(e)),
      outputFormat
    )}`;
  }
  return '';
}

function describeEnum(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.enum && schema.enum.length > 0) {
    return (
      `The value must be ${formatAsErrorIfInvalid(
        'one of the following values:',
        'enum',
        validationErrors
      )}` +
      ul(
        schema.enum.map(e => formatValue(e)),
        outputFormat
      )
    );
  }
  return '';
}

function describeDescription(schema: JsonSchemaWrapper, outputFormat: OutputFormat): string {
  if (schema.description) {
    return paragraph(italic(schema.description, outputFormat), outputFormat);
  }
  return '';
}

function describeDeprecated(schema: JsonSchemaWrapper, outputFormat: OutputFormat): string {
  if (schema.deprecated) {
    return paragraph(bold('Deprecated.', outputFormat), outputFormat);
  }
  return '';
}

function describeDefault(schema: JsonSchemaWrapper, outputFormat: OutputFormat): string {
  if (schema.default) {
    const defaultString = JSON.stringify(schema.default);
    if (!isBlank(defaultString)) {
      return paragraph(`The default value is ${formatValue(schema.default)}.`, outputFormat);
    }
  }
  return '';
}

function describeContains(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.contains) {
    const min = schema.minContains ?? 1;
    const max = schema.maxContains;

    let result = `The array must contain ${formatAsErrorIfInvalid(
      bold('at least ', outputFormat) + min,
      'minContains',
      validationErrors
    )}`;

    if (max) {
      result += paragraph(
        `${result} and ${formatAsErrorIfInvalid(
          bold('at most ' + formatValue(max), outputFormat),
          'maxContains',
          validationErrors
        )}`,
        outputFormat
      );
    }
    return paragraph(
      `${result} items that match the ${formatAsErrorIfInvalid(
        'following schema:',
        'contains',
        validationErrors
      )}
       ${describeSubSchema(schema.contains, undefined, schema)}`,
      outputFormat
    );
  }
  return '';
}

function describeConst(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.const) {
    const constString = `The value must be ${formatValue(schema.const)}.`;
    return paragraph(formatAsErrorIfInvalid(constString, 'const', validationErrors), outputFormat);
  }
  return '';
}

function describeNot(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.not) {
    const not = `The following schema must ${bold('not', outputFormat)} be fulfilled: `;
    return paragraph(
      formatAsErrorIfInvalid(not, 'not', validationErrors) +
        `<br> ${describeSubSchema(schema.not, undefined, schema)}`,
      outputFormat
    );
  }
  return '';
}

function describeAllOf(schema: JsonSchemaWrapper, outputFormat: OutputFormat): string {
  if (schema.allOf && schema.allOf.length > 0) {
    return (
      'All of the following schemas must be fulfilled: ' +
      schemaDescriptionList(schema.allOf, outputFormat)
    );
  }
  return '';
}

function describeAnyOf(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.anyOf && schema.anyOf.length > 0) {
    return (
      'At least ' +
      formatAsErrorIfInvalid('one of', 'anyOf', validationErrors) +
      ' the following schemas must be fulfilled: ' +
      schemaDescriptionList(schema.anyOf, outputFormat)
    );
  }
  return '';
}

function describeOneOf(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.oneOf && schema.oneOf.length > 0) {
    return (
      'Exactly ' +
      formatAsErrorIfInvalid('one of', 'oneOf', validationErrors) +
      ' the following schemas must be fulfilled: ' +
      schemaDescriptionList(schema.oneOf, outputFormat)
    );
  }
  return '';
}

function describeAdditionalProperties(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (!schema.hasType('object')) {
    return '';
  }
  if (schema.additionalProperties === undefined || schema.additionalProperties.isAlwaysTrue) {
    return paragraph(`Any additional properties are allowed.`, outputFormat);
  }
  if (schema.additionalProperties.isAlwaysFalse) {
    return paragraph(
      `${formatAsErrorIfInvalid(
        'No additional properties',
        'additionalProperties',
        validationErrors
      )} are allowed.`,
      outputFormat
    );
  }
  return paragraph(
    `${formatAsErrorIfInvalid(
      'Additional properties ',
      'additionalProperties',
      validationErrors
    )} must match the following schema: ${describeSubSchema(
      schema.additionalProperties,
      undefined,
      schema
    )}`,
    outputFormat
  );
}

function describeComment(schema: JsonSchemaWrapper, outputFormat: OutputFormat): string {
  if (schema.$comment && !isBlank(schema.$comment)) {
    return paragraph(`${italic(schema.$comment, outputFormat)}`, outputFormat);
  }
  return '';
}

function describeFormatAndPattern(
  schema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  if (schema.format) {
    let format = `The value must be ${formatValue(schema.format)}`;
    switch (schema.format) {
      case 'date-time':
        format += ` in the format YYYY-MM-DDThh:mm:ssZ.`;
        break;
      case 'date':
        format += ` in the format YYYY-MM-DD.`;
        break;
      case 'time':
        format += ` in the format hh:mm:ss.`;
        break;
      case 'email':
        format = `The value must be an email address according to RFC 5322.`;
        break;
      case 'idn-email':
        format = `The value must be an email address according to RFC 6531.`;
        break;
      case 'hostname':
        format = `The value must be a hostname according to RFC 1034.`;
        break;
      case 'idn-hostname':
        format = `The value must be a hostname according to RFC 5890.`;
        break;
      case 'ipv4':
        format = `The value must be an IPv4 address according to RFC 2673.`;
        break;
      case 'ipv6':
        format = `The value must be an IPv6 address according to RFC 4291.`;
        break;
      case 'uri':
        format = `The value must be a URI according to RFC 3986.`;
        break;
      case 'uri-reference':
        format = `The value must be a URI reference according to RFC 3986.`;
        break;
      case 'iri':
        format = `The value must be an IRI according to RFC 3987.`;
        break;
      case 'iri-reference':
        format = `The value must be an IRI reference according to RFC 3987.`;
        break;
      case 'uri-template':
        format = `The value must be a URI template according to RFC 6570.`;
        break;
      case 'json-pointer':
        format = `The value must be a JSON pointer according to RFC 6901.`;
        break;
      case 'relative-json-pointer':
        format = `The value must be a relative JSON pointer according to RFC 6901.`;
        break;
      case 'regex':
        format = `The value must be a regular expression according to ECMA 262.`;
        break;
    }
    return paragraph(formatAsErrorIfInvalid(format, 'format', validationErrors), outputFormat);
  }
  if (schema.pattern) {
    const pattern = `The value must match the following pattern: ${formatValue(schema.pattern)}`;
    return paragraph(formatAsErrorIfInvalid(pattern, 'pattern', validationErrors), outputFormat);
  }
  return '';
}

function describeSchemaValidationErrors(
  validationErrors: ErrorObject[],
  outputFormat: OutputFormat
): string {
  return paragraph(
    `The following validation errors were found: ${ul(
      validationErrors.map(e => formatError((e.message ?? '') + ' (at ' + e.instancePath + ')')),
      outputFormat
    )}`,
    outputFormat
  );
}

function formatType(type: SchemaPropertyType[]): string {
  if (type.length === 1) {
    return 'of type ' + formatValue(type[0]) + '.';
  }
  if (type.length === 2) {
    return `of type ${formatValue(type[0])} or ${formatValue(type[1])}.`;
  }
  if (type.length === NUMBER_OF_PROPERTY_TYPES) {
    return 'of any type.';
  }
  return `of one of the following types: ${type.map(t => formatValue(t)).join(', ')}.`;
}

function formatAsErrorIfInvalid(
  display: string,
  keyword: string,
  validationErrors: ErrorObject[]
): string {
  const relevantErrors = validationErrors.filter(e => e.keyword === keyword);
  if (relevantErrors.length === 0) {
    return display;
  }
  return `<span class='underline decoration-wavy decoration-red-600'>${display}</span>`;
}

function formatValue(value: any): string {
  const formattedValue = typeof value === 'string' ? value : JSON.stringify(value);
  return `<span class='font-mono text-violet-700 whitespace-nowrap'>${formattedValue}</span>`;
}

function formatError(error: string): string {
  return `<span class='text-red-600'>${error}</span>`;
}

function schemaDescriptionList(schemas: JsonSchemaWrapper[], outputFormat: OutputFormat): string {
  return ul(
    schemas.map(s => describeSubSchema(s, undefined, undefined)),
    outputFormat
  );
}

function describeSubSchema(
  schema: JsonSchemaWrapper,
  key?: string,
  parentSchema?: JsonSchemaWrapper,
  outputFormat: OutputFormat = OutputFormat.HTML
): string {
  let result = describeSchema(schema, key, parentSchema, false, 1);
  if (isBlank(result)) {
    result = describeSchema(schema, key, parentSchema, true, 1);
  }
  if (isBlank(result)) {
    result = div('There are no constraints on this property.', outputFormat, 1);
  }
  return result;
}

function paragraph(text: any, outputFormat: OutputFormat): string {
  return outputFormat === OutputFormat.Markdown ? `${text}\n\n` : `<p>${text}</p>`;
}

function newLine(outputFormat: OutputFormat): string {
  return outputFormat === OutputFormat.Markdown ? `  \n` : `<br>`;
}

function ul(elements: any[], outputFormat: OutputFormat): string {
  if (outputFormat === OutputFormat.Markdown) {
    return elements.map(e => `- ${e}`).join('\n') + '\n';
  }
  return `<ul class='list-disc list-inside'>${elements.map(e => `<li>${e}</li>`).join('')}</ul>`;
}

function bold(text: any, outputFormat: OutputFormat): string {
  return outputFormat === OutputFormat.Markdown
    ? `**${text}**`
    : `<b class='font-bold'>${text}</b>`;
}

function italic(text: any, outputFormat: OutputFormat): string {
  return outputFormat === OutputFormat.Markdown ? `*${text}*` : `<i class='italic'>${text}</i>`;
}

function isBlank(str: string): boolean {
  return !str || /^\s*$/.test(str);
}

function div(
  text: string,
  outputFormat: OutputFormat,
  indentation?: number,
  isInlineListItem: boolean = false
): string {
  if (outputFormat === OutputFormat.Markdown) {
    const margin = indentation ? ' '.repeat(indentation * 2) : '';
    return `${margin}${text}\n\n`;
  } else {
    const marginStyle = indentation ? `margin-left: ${indentation * 2}rem;` : '';
    const displayStyle = isInlineListItem ? 'display: inline-list-item;' : '';
    return `<div style="${marginStyle} ${displayStyle}">${text}</div>`;
  }
}
