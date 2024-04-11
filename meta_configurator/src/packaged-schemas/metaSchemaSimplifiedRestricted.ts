/**
 * This represents a simplified version of the json schema meta schema.
 * It is identical to simplifiedMetaSchema, but with the following additional changes:
 * - Removed unusual parameters from schema root level
 * - Enforcing of the type of const, enum, examples, and default values, based on type of the field
 * - Removed conditionals and not, due to conflict with enforced const types
 * - Removed the option to define different types for a field, making the type selection simpler
 */
export const META_SCHEMA_SIMPLIFIED_RESTRICTED = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'com.github.meta_configurator.simplified-meta-schema-restricted',
  title: 'Json schema (simplified and restricted)',
  $ref: '#/$defs/jsonMetaSchema',
  $defs: {
    jsonMetaSchema: {
      title: 'Json meta-schema (simplified and restricted)',
      allOf: [
        {
          $ref: '#/$defs/core',
        },
        {
          $ref: '#/$defs/rootObjectSubSchema',
        },
      ],
    },
    jsonSchema: {
      title: 'Json schema',
      $ref: '#/$defs/objectSubSchema',
      $comment:
        'This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.',
    },
    rootObjectSubSchema: {
      title: 'Root Subschema',
      type: 'object',
      allOf: [
        {
          $ref: '#/$defs/objectSubSchema',
        },
        {
          properties: {
            examples: {
              metaConfigurator: {
                advanced: true,
              },
            },
            type: {
              metaConfigurator: {
                advanced: true,
              },
            },
            default: {
              metaConfigurator: {
                advanced: true,
              },
            },
            enum: {
              metaConfigurator: {
                advanced: true,
              },
            },
            const: {
              metaConfigurator: {
                advanced: true,
              },
            },
            additionalProperties: {
              metaConfigurator: {
                advanced: true,
              },
            },
          },
        },
      ],
    },
    objectSubSchema: {
      title: 'Subschema',
      type: 'object',
      allOf: [
        {
          $ref: '#/$defs/typeDefinition',
        },
        {
          $ref: '#/$defs/meta-data',
        },
        {
          $ref: '#/$defs/enumProperty',
        },
        {
          $ref: '#/$defs/constProperty',
        },
        {
          $ref: '#/$defs/typeSpecificFields',
        },
        {
          $ref: '#/$defs/schemaComposition',
        },
        {
          $ref: '#/$defs/refProperty',
        },
        {
          $ref: '#/$defs/anchor',
        },
      ],
    },
    constProperty: {
      title: 'Constant',
      type: ['object'],
      properties: {
        const: {
          description:
            'The value of this keyword MAY be of any type, including null.\n' +
            '\n' +
            'Use of this keyword is functionally equivalent to an "enum" with a single value.\n' +
            '\n' +
            'An instance validates successfully against this keyword if its value is equal to the value of the keyword.',
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-const',
        },
      },
      allOf: [
        {
          if: {
            $ref: '#/$defs/hasTypeArray',
          },
          then: {
            properties: {
              const: {
                type: 'array',
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeObject',
          },
          then: {
            properties: {
              const: {
                type: 'object',
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeString',
          },
          then: {
            properties: {
              const: {
                type: 'string',
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeNumberOrInteger',
          },
          then: {
            properties: {
              const: {
                type: 'number',
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeBoolean',
          },
          then: {
            properties: {
              const: {
                type: 'boolean',
              },
            },
          },
        },
      ],
    },
    enumProperty: {
      title: 'Enumeration',
      type: ['object'],
      properties: {
        enum: {
          type: 'array',
          items: true,
          description:
            'The value of this keyword MUST be an array. This array SHOULD have at least one element. Elements in the array SHOULD be unique.\n' +
            '\n' +
            "An instance validates successfully against this keyword if its value is equal to one of the elements in this keyword's array value.\n" +
            '\n' +
            'Elements in the array might be of any type, including null.',
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-enum',
        },
      },
      allOf: [
        {
          if: {
            $ref: '#/$defs/hasTypeArray',
          },
          then: {
            properties: {
              enum: {
                items: {
                  type: 'array',
                },
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeObject',
          },
          then: {
            properties: {
              enum: {
                items: {
                  type: 'object',
                },
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeString',
          },
          then: {
            properties: {
              enum: {
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeNumberOrInteger',
          },
          then: {
            properties: {
              enum: {
                items: {
                  type: 'number',
                },
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeBoolean',
          },
          then: {
            properties: {
              enum: {
                items: {
                  type: 'boolean',
                },
              },
            },
          },
        },
      ],
    },
    schemaComposition: {
      title: 'Schema composition with "allOf", "anyOf", "oneOf"',
      properties: {
        allOf: {
          description:
            "This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.\n" +
            '\n' +
            "An instance validates successfully against this keyword if it validates successfully against all schemas defined by this keyword's value.",
          $ref: '#/$defs/schemaArray',
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-allof',
          metaConfigurator: {
            advanced: true,
          },
        },
        anyOf: {
          $ref: '#/$defs/schemaArray',
          description:
            "This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.\n" +
            '\n' +
            "An instance validates successfully against this keyword if it validates successfully against at least one schema defined by this keyword's value. Note that when annotations are being collected, all subschemas MUST be examined so that annotations are collected from each subschema that validates successfully.",
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-anyof',
          metaConfigurator: {
            advanced: true,
          },
        },
        oneOf: {
          description:
            "This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.\n" +
            '\n' +
            "An instance validates successfully against this keyword if it validates successfully against exactly one schema defined by this keyword's value.",
          $ref: '#/$defs/schemaArray',
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-oneof',
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    core: {
      title: 'Core vocabulary meta-schema',
      properties: {
        $id: {
          description:
            'The "$id" keyword identifies a schema resource with its canonical [RFC6596] URI.\n' +
            '\n' +
            'Note that this URI is an identifier and not necessarily a network locator. In the case of a network-addressable URL, a schema need not be downloadable from its canonical URI.\n' +
            '\n' +
            'If present, the value for this keyword MUST be a string, and MUST represent a valid URI-reference [RFC3986]. This URI-reference SHOULD be normalized, and MUST resolve to an absolute-URI [RFC3986] (without a fragment), or to a URI with an empty fragment.',
          $ref: '#/$defs/uriReferenceString',
          $comment: 'Non-empty fragments not allowed.',
          pattern: '^[^#]*#?$',
        },
        $schema: {
          description:
            'The "$schema" keyword is both used as a JSON Schema dialect identifier and as the identifier of a resource which is itself a JSON Schema, which describes the set of valid schemas written for this particular dialect.',
          $ref: '#/$defs/uriString',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-core#name-the-schema-keyword',
          examples: [
            'https://json-schema.org/draft/2020-12/schema',
            'https://json-schema.org/draft/2019-09/schema',
            'http://json-schema.org/draft-07/schema#',
            'http://json-schema.org/draft-06/schema#',
            'http://json-schema.org/draft-04/schema#',
          ],
        },
        $vocabulary: {
          type: 'object',
          description:
            'The "$vocabulary" keyword is used in meta-schemas to identify the vocabularies available for use in schemas described by that meta-schema. It is also used to indicate whether each vocabulary is required or optional, in the sense that an implementation MUST understand the required vocabularies in order to successfully process the schema. Together, this information forms a dialect. Any vocabulary that is understood by the implementation MUST be processed in a manner consistent with the semantic definitions contained within the vocabulary.',
          propertyNames: {
            $ref: '#/$defs/uriString',
          },
          additionalProperties: {
            type: 'boolean',
          },
          metaConfigurator: {
            advanced: true,
          },
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-core#name-the-vocabulary-keyword',
        },
        $comment: {
          type: 'string',
          description:
            'This keyword reserves a location for comments from schema authors to readers or maintainers of the schema.\n' +
            '\n' +
            'The value of this keyword MUST be a string. Implementations MUST NOT present this string to end users. Tools for editing schemas SHOULD support displaying and editing this keyword. The value of this keyword MAY be used in debug or error output which is intended for developers making use of schemas.',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-core#name-comments-with-comment',
          metaConfigurator: {
            advanced: true,
          },
        },
        $defs: {
          type: 'object',
          description:
            'The "$defs" keyword reserves a location for schema authors to inline re-usable JSON Schemas into a more general schema. The keyword does not directly affect the validation result.\n' +
            '\n' +
            "This keyword's value MUST be an object. Each member value of this object MUST be a valid JSON Schema.",
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-core#name-schema-re-use-with-defs',
        },
        definitions: {
          $comment: '"definitions" has been replaced by "$defs".',
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
          deprecated: true,
          default: {},
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    typeSpecificFields: {
      allOf: [
        {
          if: {
            $ref: '#/$defs/hasTypeArray',
          },
          then: {
            $ref: '#/$defs/arrayProperty',
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeObject',
          },
          then: {
            $ref: '#/$defs/objectProperty',
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeString',
          },
          then: {
            $ref: '#/$defs/stringProperty',
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeNumberOrInteger',
          },
          then: {
            $ref: '#/$defs/numberProperty',
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeBoolean',
          },
          then: {
            $ref: '#/$defs/booleanProperty',
          },
        },
      ],
    },
    numberProperty: {
      title: 'Number property',
      properties: {
        maximum: {
          description:
            'The value of "maximum" MUST be a number, representing an inclusive upper limit for a numeric instance.\n' +
            '\n' +
            'If the instance is a number, then this keyword validates only if the instance is less than or exactly equal to "maximum".',
          type: 'number',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-maximum',
        },
        exclusiveMaximum: {
          description:
            'The value of "exclusiveMaximum" MUST be a number, representing an exclusive upper limit for a numeric instance.\n' +
            '\n' +
            'If the instance is a number, then the instance is valid only if it has a value strictly less than (not equal to) "exclusiveMaximum".',
          type: 'number',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-exclusivemaximum',
        },
        minimum: {
          description:
            'The value of "minimum" MUST be a number, representing an inclusive lower limit for a numeric instance.\n' +
            '\n' +
            'If the instance is a number, then this keyword validates only if the instance is greater than or exactly equal to "minimum".',
          type: 'number',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-minimum',
        },
        exclusiveMinimum: {
          type: 'number',
          description:
            'The value of "exclusiveMinimum" MUST be a number, representing an exclusive lower limit for a numeric instance.\n' +
            '\n' +
            'If the instance is a number, then the instance is valid only if it has a value strictly greater than (not equal to) "exclusiveMinimum".',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-exclusiveminimum',
        },
        multipleOf: {
          type: 'number',
          exclusiveMinimum: 0,
          description:
            'The value of "multipleOf" MUST be a number, strictly greater than 0.\n' +
            '\n' +
            "A numeric instance is valid only if division by this keyword's value results in an integer.",
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-multipleof',
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    metaObjectProperty: {
      title: 'Meta Object property',
      properties: {
        properties: {
          type: 'object',
          description:
            'The value of "properties" MUST be an object. Each value of this object MUST be a valid JSON Schema.\n' +
            '\n' +
            "Validation succeeds if, for each name that appears in both the instance and as a name within this keyword's value, the child instance for that name successfully validates against the corresponding schema.\n" +
            '\n' +
            'The annotation result of this keyword is the set of instance property names matched by this keyword. This annotation affects the behavior of "additionalProperties" (in this vocabulary) and "unevaluatedProperties" in the Unevaluated vocabulary.\n' +
            '\n' +
            'Omitting this keyword has the same assertion behavior as an empty object.',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-properties',
          default: {},
        },
      },
    },
    objectProperty: {
      title: 'Object property',
      properties: {
        properties: {
          type: 'object',
          description:
            'The value of "properties" MUST be an object. Each value of this object MUST be a valid JSON Schema.\n' +
            '\n' +
            "Validation succeeds if, for each name that appears in both the instance and as a name within this keyword's value, the child instance for that name successfully validates against the corresponding schema.\n" +
            '\n' +
            'The annotation result of this keyword is the set of instance property names matched by this keyword. This annotation affects the behavior of "additionalProperties" (in this vocabulary) and "unevaluatedProperties" in the Unevaluated vocabulary.\n' +
            '\n' +
            'Omitting this keyword has the same assertion behavior as an empty object.',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-properties',
          default: {},
        },
        required: {
          description:
            'The value of this keyword MUST be an array. Elements of this array, if any, MUST be strings, and MUST be unique.\n' +
            '\n' +
            'An object instance is valid against this keyword if every item in the array is the name of a property in the instance.\n' +
            '\n' +
            'Omitting this keyword has the same behavior as an empty array.',
          $ref: '#/$defs/stringArray',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-required',
        },
        patternProperties: {
          type: 'object',
          description:
            'The value of "patternProperties" MUST be an object. Each property name of this object SHOULD be a valid regular expression, according to the ECMA-262 regular expression dialect. Each property value of this object MUST be a valid JSON Schema.\n' +
            '\n' +
            "Validation succeeds if, for each instance name that matches any regular expressions that appear as a property name in this keyword's value, the child instance for that name successfully validates against each schema that corresponds to a matching regular expression.\n" +
            '\n' +
            'The annotation result of this keyword is the set of instance property names matched by this keyword. This annotation affects the behavior of "additionalProperties" (in this vocabulary) and "unevaluatedProperties" (in the Unevaluated vocabulary).\n' +
            '\n' +
            'Omitting this keyword has the same assertion behavior as an empty object.',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
          propertyNames: {
            format: 'regex',
          },
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-patternproperties',
          default: {},
          metaConfigurator: {
            advanced: true,
          },
        },
        maxProperties: {
          description:
            'The value of this keyword MUST be a non-negative integer.\n' +
            '\n' +
            'An object instance is valid against "maxProperties" if its number of properties is less than, or equal to, the value of this keyword.',
          $ref: '#/$defs/nonNegativeInteger',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-maxproperties',
          metaConfigurator: {
            advanced: true,
          },
        },
        minProperties: {
          description:
            'The value of this keyword MUST be a non-negative integer.\n' +
            '\n' +
            'An object instance is valid against "minProperties" if its number of properties is greater than, or equal to, the value of this keyword.\n' +
            '\n' +
            'Omitting this keyword has the same behavior as a value of 0.',
          $ref: '#/$defs/nonNegativeIntegerDefault0',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-minproperties',
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    booleanProperty: {
      title: 'Boolean property',
    },
    stringProperty: {
      title: 'String property',
      properties: {
        maxLength: {
          description:
            'The value of this keyword MUST be a non-negative integer.\n' +
            '\n' +
            'A string instance is valid against this keyword if its length is less than, or equal to, the value of this keyword.',
          $ref: '#/$defs/nonNegativeInteger',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-maxlength',
        },
        minLength: {
          description:
            'The value of this keyword MUST be a non-negative integer.\n' +
            '\n' +
            'A string instance is valid against this keyword if its length is greater than, or equal to, the value of this keyword.\n' +
            '\n' +
            'Omitting this keyword has the same behavior as a value of 0.',
          $ref: '#/$defs/nonNegativeIntegerDefault0',
          default: 0,
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-minlength',
        },
        pattern: {
          description:
            'The value of this keyword MUST be a string. This string SHOULD be a valid regular expression, according to the ECMA-262 regular expression dialect.\n' +
            '\n' +
            'A string instance is considered valid if the regular expression matches the instance successfully. Recall: regular expressions are not implicitly anchored.',
          type: 'string',
          format: 'regex',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-pattern',
        },
        format: {
          type: 'string',
          examples: [
            'date-time',
            'time',
            'date',
            'duration',
            'email',
            'idn-email',
            'hostname',
            'idn-hostname',
            'ipv4',
            'ipv6',
            'uri',
            'uri-reference',
            'iri',
            'iri-reference',
            'uri-template',
            'json-pointer',
            'relative-json-pointer',
            'regex',
          ],
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-vocabularies-for-semantic-c',
        },
        contentEncoding: {
          type: 'string',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-contentencoding',
          metaConfigurator: {
            advanced: true,
          },
        },
        contentMediaType: {
          type: 'string',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-contentmediatype',
          metaConfigurator: {
            advanced: true,
          },
        },
        contentSchema: {
          $ref: '#/$defs/jsonSchema',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-contentschema',
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    arrayProperty: {
      title: 'Array property',
      properties: {
        items: {
          description:
            'The value of "items" MUST be a valid JSON Schema.\n' +
            '\n' +
            'This keyword applies its subschema to all instance elements at indexes greater than the length of the "prefixItems" array in the same schema object, as reported by the annotation result of that "prefixItems" keyword. If no such annotation result exists, "items" applies its subschema to all instance array elements. Note that the behavior of "items" without "prefixItems" is identical to that of the schema form of "items" in prior drafts. When "prefixItems" is present, the behavior of "items" is identical to the former "additionalItems" keyword. ',
          $ref: '#/$defs/jsonSchema',
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-items',
        },
        minItems: {
          description:
            'The value of this keyword MUST be a non-negative integer.\n' +
            '\n' +
            'An array instance is valid against "minItems" if its size is greater than, or equal to, the value of this keyword.\n' +
            '\n' +
            'Omitting this keyword has the same behavior as a value of 0.',
          $ref: '#/$defs/nonNegativeIntegerDefault0',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-minitems',
        },
        maxItems: {
          description:
            'The value of this keyword MUST be a non-negative integer.\n' +
            '\n' +
            'An array instance is valid against "maxItems" if its size is less than, or equal to, the value of this keyword.',
          $ref: '#/$defs/nonNegativeInteger',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-maxitems',
        },
        contains: {
          description:
            'The value of this keyword MUST be a valid JSON Schema.\n' +
            '\n' +
            'An array instance is valid against "contains" if at least one of its elements is valid against the given schema, except when "minContains" is present and has a value of 0, in which case an array instance MUST be considered valid against the "contains" keyword, even if none of its elements is valid against the given schema.',
          $ref: '#/$defs/jsonSchema',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-contains',
          metaConfigurator: {
            advanced: true,
          },
        },
        minContains: {
          description:
            'The value of this keyword MUST be a non-negative integer.\n' +
            '\n' +
            'If "contains" is not present within the same schema object, then this keyword has no effect.\n' +
            '\n' +
            'minContains and maxContains can be used with contains to further specify how many times a schema matches a contains constraint. These keywords can be any non-negative number including zero.',
          $ref: '#/$defs/nonNegativeInteger',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-mincontains',
          metaConfigurator: {
            advanced: true,
          },
          default: 1,
        },
        maxContains: {
          description:
            'The value of this keyword MUST be a non-negative integer.\n' +
            '\n' +
            'If "contains" is not present within the same schema object, then this keyword has no effect.\n' +
            '\n' +
            'minContains and maxContains can be used with contains to further specify how many times a schema matches a contains constraint. These keywords can be any non-negative number including zero.',
          $ref: '#/$defs/nonNegativeInteger',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-maxcontains',
          metaConfigurator: {
            advanced: true,
          },
        },
        prefixItems: {
          description:
            'The value of "prefixItems" MUST be a non-empty array of valid JSON Schemas.\n' +
            '\n' +
            "Validation succeeds if each element of the instance validates against the schema at the same position, if any. This keyword does not constrain the length of the array. If the array is longer than this keyword's value, this keyword validates only the prefix of matching length.",
          $ref: '#/$defs/schemaArray',
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-prefixitems',
          metaConfigurator: {
            advanced: true,
          },
        },
        uniqueItems: {
          description:
            'The value of this keyword MUST be a boolean.\n' +
            '\n' +
            'If this keyword has boolean value false, the instance validates successfully. If it has boolean value true, the instance validates successfully if all of its elements are unique.\n' +
            '\n' +
            'Omitting this keyword has the same behavior as a value of false.',
          type: 'boolean',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation.html#name-uniqueitems',
          default: false,
        },
      },
    },
    refProperty: {
      title: 'Reference',
      properties: {
        $ref: {
          $ref: '#/$defs/uriReferenceString',
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-schema-references',
        },
        $dynamicRef: {
          $ref: '#/$defs/uriReferenceString',
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-core#name-schema-references',
          metaConfigurator: {
            advanced: true,
          },
        },
        $recursiveRef: {
          $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
          type: 'string',
          format: 'uri-reference',
          deprecated: true,
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    'rootMeta-data': {
      properties: {
        title: {
          type: 'string',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-title-and-description',
        },
        description: {
          type: 'string',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-title-and-description',
        },
      },
    },
    'meta-data': {
      properties: {
        title: {
          type: 'string',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-title-and-description',
        },
        description: {
          type: 'string',
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-title-and-description',
        },
        examples: {
          type: 'array',
          description:
            'The value of this keyword MUST be an array. There are no restrictions placed on the values within the array. When multiple occurrences of this keyword are applicable to a single sub-instance, implementations MUST provide a flat array of all values rather than an array of arrays.\n' +
            '\n' +
            'This keyword can be used to provide sample JSON values associated with a particular schema, for the purpose of illustrating usage. It is RECOMMENDED that these values be valid against the associated schema.\n' +
            '\n' +
            'Implementations MAY use the value(s) of "default", if present, as an additional example. If "examples" is absent, "default" MAY still be used in this manner.',
          items: true,
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-validation#name-examples',
        },
        default: {
          description:
            'There are no restrictions placed on the value of this keyword. When multiple occurrences of this keyword are applicable to a single sub-instance, implementations SHOULD remove duplicates.\n' +
            '\n' +
            'This keyword can be used to supply a default JSON value associated with a particular schema. It is RECOMMENDED that a default value be valid against the associated schema.',
        },
        deprecated: {
          type: 'boolean',
          description:
            'The value of this keyword MUST be a boolean. When multiple occurrences of this keyword are applicable to a single sub-instance, applications SHOULD consider the instance location to be deprecated if any occurrence specifies a true value.\n' +
            '\n' +
            'If "deprecated" has a value of boolean true, it indicates that applications SHOULD refrain from usage of the declared property. It MAY mean the property is going to be removed in the future.\n' +
            '\n' +
            'A root schema containing "deprecated" with a value of true indicates that the entire resource being described MAY be removed in the future.\n' +
            '\n' +
            'The "deprecated" keyword applies to each instance location to which the schema object containing the keyword successfully applies. This can result in scenarios where every array item or object property is deprecated even though the containing array or object is not.\n' +
            '\n' +
            'Omitting this keyword has the same behavior as a value of false.',
          default: false,
          $comment: 'https://json-schema.org/draft/2020-12/json-schema-validation#name-deprecated',
          metaConfigurator: {
            advanced: true,
          },
        },
        readOnly: {
          type: 'boolean',
          default: false,
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-readonly-and-writeonly',
          metaConfigurator: {
            advanced: true,
          },
        },
        writeOnly: {
          type: 'boolean',
          default: false,
          $comment:
            'https://json-schema.org/draft/2020-12/json-schema-validation#name-readonly-and-writeonly',
          metaConfigurator: {
            advanced: true,
          },
        },
      },
      allOf: [
        {
          if: {
            $ref: '#/$defs/hasTypeArray',
          },
          then: {
            properties: {
              examples: {
                items: {
                  type: 'array',
                },
              },
              default: {
                type: 'array',
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeObject',
          },
          then: {
            properties: {
              examples: {
                items: {
                  type: 'object',
                },
              },
              default: {
                type: 'object',
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeString',
          },
          then: {
            properties: {
              examples: {
                items: {
                  type: 'string',
                },
              },
              default: {
                type: 'string',
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeNumberOrInteger',
          },
          then: {
            properties: {
              examples: {
                items: {
                  type: 'number',
                },
              },
              default: {
                type: 'number',
              },
            },
          },
        },
        {
          if: {
            $ref: '#/$defs/hasTypeBoolean',
          },
          then: {
            properties: {
              examples: {
                items: {
                  type: 'boolean',
                },
              },
              default: {
                type: 'boolean',
              },
            },
          },
        },
      ],
    },
    hasTypeArray: {
      anyOf: [
        {
          properties: {
            type: {
              const: 'array',
            },
          },
        },
        {
          properties: {
            type: {
              type: 'array',
              contains: {
                const: 'array',
              },
            },
          },
        },
      ],
      required: ['type'],
    },
    hasTypeObject: {
      anyOf: [
        {
          properties: {
            type: {
              const: 'object',
            },
          },
        },
        {
          properties: {
            type: {
              type: 'array',
              contains: {
                const: 'object',
              },
            },
          },
        },
      ],
      required: ['type'],
    },
    hasTypeBoolean: {
      anyOf: [
        {
          properties: {
            type: {
              const: 'boolean',
            },
          },
        },
        {
          properties: {
            type: {
              type: 'array',
              contains: {
                const: 'boolean',
              },
            },
          },
        },
      ],
      required: ['type'],
    },
    hasTypeString: {
      anyOf: [
        {
          properties: {
            type: {
              const: 'string',
            },
          },
        },
        {
          properties: {
            type: {
              type: 'array',
              contains: {
                const: 'string',
              },
            },
          },
        },
      ],
      required: ['type'],
    },
    hasTypeNumberOrInteger: {
      oneOf: [
        {
          properties: {
            type: {
              enum: ['number', 'integer'],
            },
          },
        },
        {
          properties: {
            type: {
              type: 'array',
              contains: {
                enum: ['number', 'integer'],
              },
            },
          },
        },
      ],
      required: ['type'],
    },
    anchor: {
      title: 'Anchor definition',
      properties: {
        $anchor: {
          $ref: '#/$defs/anchorString',
          metaConfigurator: {
            advanced: true,
          },
        },
        $dynamicAnchor: {
          $ref: '#/$defs/anchorString',
          metaConfigurator: {
            advanced: true,
          },
        },
        $recursiveAnchor: {
          $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
          type: 'string',
          pattern: '^[A-Za-z_][-A-Za-z0-9._]*$',
          deprecated: true,
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    anchorString: {
      type: 'string',
      pattern: '^[A-Za-z_][-A-Za-z0-9._]*$',
    },
    uriString: {
      type: 'string',
      format: 'uri',
    },
    uriReferenceString: {
      type: 'string',
      format: 'uri-reference',
    },
    schemaArray: {
      type: 'array',
      minItems: 1,
      items: {
        $ref: '#/$defs/jsonSchema',
      },
    },
    nonNegativeInteger: {
      type: 'integer',
      minimum: 0,
    },
    nonNegativeIntegerDefault0: {
      $ref: '#/$defs/nonNegativeInteger',
      default: 0,
    },
    typeDefinition: {
      properties: {
        type: {
          $ref: '#/$defs/simpleTypes',
        },
      },
    },
    simpleTypes: {
      title: 'Single type',
      enum: ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string'],
      type: 'string',
    },
    stringArray: {
      type: 'array',
      items: {
        type: 'string',
      },
      uniqueItems: true,
      default: [],
    },
  },
};
