export const simplifiedMetaSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'com.github.config-assistant.simplified-meta-schema',
  title: 'Json schema (simplified)',
  $ref: '#/$defs/jsonMetaSchema',
  $defs: {
    jsonMetaSchema: {
      title: 'Json meta-schema',
      allOf: [
        {
          $ref: '#/$defs/core',
        },
        {
          $ref: '#/$defs/jsonSchema',
        },
        {
          type: 'object',
        },
      ],
    },
    jsonSchema: {
      title: 'Json schema',
      oneOf: [
        {
          title: 'Always valid',
          type: 'boolean',
          const: true,
        },
        {
          title: 'Always invalid',
          type: 'boolean',
          const: false,
        },
        {
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
              $ref: '#/$defs/conditionalSchema',
            },
            {
              $ref: '#/$defs/anchor',
            },
          ],
        },
      ],

      $comment:
        'This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.',
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
    },
    schemaComposition: {
      title: 'Schema composition with "allOf", "anyOf", "oneOf", "not"',
      properties: {
        allOf: {
          $ref: '#/$defs/schemaArray',
          metaConfigurator: {
            advanced: true,
          },
        },
        anyOf: {
          $ref: '#/$defs/schemaArray',
          metaConfigurator: {
            advanced: true,
          },
        },
        oneOf: {
          $ref: '#/$defs/schemaArray',
          metaConfigurator: {
            advanced: true,
          },
        },
        not: {
          $ref: '#/$defs/jsonSchema',
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    conditionalSchema: {
      title: 'Conditional schema with "if", "then", "else"',
      properties: {
        if: {
          $ref: '#/$defs/jsonSchema',
          metaConfigurator: {
            advanced: true,
          },
        },
      },
      if: {
        required: ['if'],
      },
      then: {
        properties: {
          then: {
            $ref: '#/$defs/jsonSchema',
          },
          else: {
            $ref: '#/$defs/jsonSchema',
          },
        },
      },
    },
    core: {
      title: 'Core vocabulary meta-schema',
      properties: {
        $id: {
          $ref: '#/$defs/uriReferenceString',
          $comment: 'Non-empty fragments not allowed.',
          pattern: '^[^#]*#?$',
        },
        $schema: {
          $ref: '#/$defs/uriString',
        },
        $vocabulary: {
          type: 'object',
          propertyNames: {
            $ref: '#/$defs/uriString',
          },
          additionalProperties: {
            type: 'boolean',
          },
          metaConfigurator: {
            advanced: true,
          },
        },
        $comment: {
          type: 'string',
          metaConfigurator: {
            advanced: true,
          },
        },
        $defs: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
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
      ],
    },
    numberProperty: {
      title: 'Number property',
      properties: {
        maximum: {
          type: 'number',
        },
        exclusiveMaximum: {
          type: 'number',
        },
        minimum: {
          type: 'number',
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
    objectProperty: {
      title: 'Object property',
      properties: {
        properties: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
          default: {},
        },
        required: {
          $ref: '#/$defs/stringArray',
        },
        patternProperties: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
          propertyNames: {
            format: 'regex',
          },
          default: {},
          metaConfigurator: {
            advanced: true,
          },
        },
        additionalProperties: {
          $ref: '#/$defs/jsonSchema',
        },
        maxProperties: {
          $ref: '#/$defs/nonNegativeInteger',
          metaConfigurator: {
            advanced: true,
          },
        },
        minProperties: {
          $ref: '#/$defs/nonNegativeIntegerDefault0',
          metaConfigurator: {
            advanced: true,
          },
        },
        propertyNames: {
          $ref: '#/$defs/jsonSchema',
          metaConfigurator: {
            advanced: true,
          },
        },
        dependentRequired: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/stringArray',
          },
          metaConfigurator: {
            advanced: true,
          },
        },
        dependentSchemas: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
          default: {},
          metaConfigurator: {
            advanced: true,
          },
        },
        unevaluatedProperties: {
          $ref: '#/$defs/jsonSchema',
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    stringProperty: {
      title: 'String property',
      properties: {
        maxLength: {
          $ref: '#/$defs/nonNegativeInteger',
        },
        minLength: {
          $ref: '#/$defs/nonNegativeIntegerDefault0',
        },
        pattern: {
          type: 'string',
          format: 'regex',
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
        },
        contentEncoding: {
          type: 'string',
          metaConfigurator: {
            advanced: true,
          },
        },
        contentMediaType: {
          type: 'string',
          metaConfigurator: {
            advanced: true,
          },
        },
        contentSchema: {
          $ref: '#/$defs/jsonSchema',
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
          $ref: '#/$defs/jsonSchema',
        },
        minItems: {
          $ref: '#/$defs/nonNegativeIntegerDefault0',
        },
        maxItems: {
          $ref: '#/$defs/nonNegativeInteger',
        },
        contains: {
          $ref: '#/$defs/jsonSchema',
          metaConfigurator: {
            advanced: true,
          },
        },
        minContains: {
          $ref: '#/$defs/nonNegativeInteger',
          metaConfigurator: {
            advanced: true,
          },
          default: 1,
        },
        maxContains: {
          $ref: '#/$defs/nonNegativeInteger',
          metaConfigurator: {
            advanced: true,
          },
        },
        prefixItems: {
          $ref: '#/$defs/schemaArray',
          metaConfigurator: {
            advanced: true,
          },
        },
        uniqueItems: {
          type: 'boolean',
          default: false,
        },
        unevaluatedItems: {
          $ref: '#/$defs/jsonSchema',
          metaConfigurator: {
            advanced: true,
          },
        },
      },
    },
    refProperty: {
      title: 'Reference',
      properties: {
        $ref: {
          $ref: '#/$defs/uriReferenceString',
        },
        $dynamicRef: {
          $ref: '#/$defs/uriReferenceString',
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
    'meta-data': {
      properties: {
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        examples: {
          type: 'array',
          items: true,
        },
        default: true,
        deprecated: {
          type: 'boolean',
          default: false,
          metaConfigurator: {
            advanced: true,
          },
        },
        readOnly: {
          type: 'boolean',
          default: false,
          metaConfigurator: {
            advanced: true,
          },
        },
        writeOnly: {
          type: 'boolean',
          default: false,
          metaConfigurator: {
            advanced: true,
          },
        },
      },
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
          oneOf: [
            {
              $ref: '#/$defs/simpleTypes',
              title: 'Simple type',
            },
            {
              title: 'Type union',
              type: 'array',
              items: {
                $ref: '#/$defs/simpleTypes',
              },
              minItems: 1,
              uniqueItems: true,
            },
          ],
        },
      },
    },
    simpleTypes: {
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
