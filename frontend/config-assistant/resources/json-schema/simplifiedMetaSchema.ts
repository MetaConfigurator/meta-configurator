export const simplifiedMetaSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'com.github.config-assistant.simplified-meta-schema',
  title: 'Json schema (simplified)',
  $ref: '#/$defs/jsonMetaSchema',
  $defs: {
    jsonMetaSchema: {
      allOf: [
        {
          $ref: '#/$defs/core',
        },
        {
          $ref: '#/$defs/objectProperty',
        },
      ],
    },
    jsonSchema: {
      anyOf: [
        {
          title: 'True or false',
          type: 'boolean',
        },
        {
          $ref: '#/$defs/booleanProperty',
        },
        {
          $ref: '#/$defs/stringProperty',
        },
        {
          $ref: '#/$defs/numberProperty',
        },
        {
          $ref: '#/$defs/objectProperty',
        },
        {
          $ref: '#/$defs/arrayProperty',
        },
        {
          $ref: '#/$defs/nullProperty',
        },
        {
          $ref: '#/$defs/enumOrConstProperty',
        },
        {
          $ref: '#/$defs/schemaComposition',
        },
        {
          $ref: '#/$defs/conditionalSchema',
        },
        {
          $ref: '#/$defs/refProperty',
        },
      ],
      type: ['object', 'boolean'],
      $comment:
        'This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.',
    },
    nullProperty: {
      title: 'Null property',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          const: 'null',
        },
      },
    },
    enumOrConstProperty: {
      title: 'Enumeration or Constant',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          anyOf: [
            {
              $ref: '#/$defs/simpleTypes',
            },
            {
              type: 'array',
              items: {
                $ref: '#/$defs/simpleTypes',
              },
              minItems: 1,
              uniqueItems: true,
            },
          ],
        },
        const: true,
        enum: {
          type: 'array',
          items: true,
        },
      },
    },
    schemaComposition: {
      title: 'Schema composition with "allOf", "anyOf", "oneOf", "not"',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        allOf: {
          $ref: '#/$defs/schemaArray',
        },
        anyOf: {
          $ref: '#/$defs/schemaArray',
        },
        oneOf: {
          $ref: '#/$defs/schemaArray',
        },
        not: {
          $ref: '#/$defs/jsonSchema',
        },
      },
    },
    conditionalSchema: {
      title: 'Conditional schema with "if", "then", "else"',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        if: {
          $ref: '#/$defs/jsonSchema',
        },
        then: {
          $ref: '#/$defs/jsonSchema',
        },
        else: {
          $ref: '#/$defs/jsonSchema',
        },
      },
    },
    core: {
      title: 'Core vocabulary meta-schema',
      type: ['object', 'boolean'],
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
        },
        $comment: {
          type: 'string',
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
        },
      },
    },
    booleanProperty: {
      title: 'Boolean property',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          const: 'boolean',
        },
      },
    },
    numberProperty: {
      title: 'Number property',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          enum: ['number', 'integer'],
        },
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
        },
        multipleOf: {
          type: 'number',
          exclusiveMinimum: 0,
        },
      },
    },
    objectProperty: {
      title: 'Object property',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          const: 'object',
        },
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
        },
        additionalProperties: {
          $ref: '#/$defs/jsonSchema',
        },
        maxProperties: {
          $ref: '#/$defs/nonNegativeInteger',
        },
        minProperties: {
          $ref: '#/$defs/nonNegativeIntegerDefault0',
        },
        propertyNames: {
          $ref: '#/$defs/jsonSchema',
        },
        dependentRequired: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/stringArray',
          },
        },
        dependencies: {
          $comment:
            '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
          type: 'object',
          additionalProperties: {
            anyOf: [
              {
                $ref: '#/$defs/jsonSchema',
              },
              {
                type: 'array',
                items: {
                  type: 'string',
                },
                uniqueItems: true,
                default: [],
              },
            ],
          },
          deprecated: true,
          default: {},
        },
        dependentSchemas: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
          },
          default: {},
        },
        unevaluatedProperties: {
          $ref: '#/$defs/jsonSchema',
        },
      },
    },
    stringProperty: {
      title: 'String property',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          enum: ['string'],
        },
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
        },
        contentEncoding: {
          type: 'string',
        },
        contentMediaType: {
          type: 'string',
        },
        contentSchema: {
          $ref: '#/$defs/jsonSchema',
        },
      },
    },
    arrayProperty: {
      title: 'Array property',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          const: 'array',
        },
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
        },
        minContains: {
          $ref: '#/$defs/nonNegativeInteger',
          default: 1,
        },
        maxContains: {
          $ref: '#/$defs/nonNegativeInteger',
        },
        prefixItems: {
          $ref: '#/$defs/schemaArray',
        },
        uniqueItems: {
          type: 'boolean',
          default: false,
        },
        unevaluatedItems: {
          $ref: '#/$defs/jsonSchema',
        },
      },
    },
    refProperty: {
      title: 'Reference',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        $ref: {
          $ref: '#/$defs/uriReferenceString',
        },
        $dynamicRef: {
          $ref: '#/$defs/uriReferenceString',
        },
        $recursiveRef: {
          $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
          type: 'string',
          format: 'uri-reference',
          deprecated: true,
        },
      },
    },
    'meta-data': {
      type: ['object', 'boolean'],
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
        },
        readOnly: {
          type: 'boolean',
          default: false,
        },
        writeOnly: {
          type: 'boolean',
          default: false,
        },
      },
    },
    anchor: {
      title: 'Anchor definition',
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        $anchor: {
          $ref: '#/$defs/anchorString',
        },
        $dynamicAnchor: {
          $ref: '#/$defs/anchorString',
        },
        $recursiveAnchor: {
          $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
          type: 'string',
          pattern: '^[A-Za-z_][-A-Za-z0-9._]*$',
          deprecated: true,
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
