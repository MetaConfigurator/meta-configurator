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
          $ref: '#/$defs/jsonSchema',
        },
      ],
    },
    jsonSchema: {
      anyOf: [
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
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          const: 'boolean',
        },
      },
    },
    numberProperty: {
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          enum: ['number', 'integer'],
        },
        multipleOf: {
          type: 'number',
          exclusiveMinimum: 0,
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
      },
    },
    objectProperty: {
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          const: 'object',
        },
        maxProperties: {
          $ref: '#/$defs/nonNegativeInteger',
        },
        minProperties: {
          $ref: '#/$defs/nonNegativeIntegerDefault0',
        },
        required: {
          $ref: '#/$defs/stringArray',
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
                $dynamicRef: '#meta',
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
        additionalProperties: {
          $ref: '#/$defs/jsonSchema',
          $dynamicRef: '#meta',
        },
        properties: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
            $dynamicRef: '#meta',
          },
          default: {},
        },
        patternProperties: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
            $dynamicRef: '#meta',
          },
          propertyNames: {
            format: 'regex',
          },
          default: {},
        },
        dependentSchemas: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/jsonSchema',
            $dynamicRef: '#meta',
          },
          default: {},
        },
        propertyNames: {
          $ref: '#/$defs/jsonSchema',
          $dynamicRef: '#meta',
        },
        unevaluatedProperties: {
          $ref: '#/$defs/jsonSchema',
          $dynamicRef: '#meta',
        },
      },
    },
    stringProperty: {
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          const: 'string',
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
          $dynamicRef: '#meta',
        },
      },
    },
    arrayProperty: {
      type: ['object'],
      $ref: '#/$defs/meta-data',
      properties: {
        type: {
          const: 'array',
        },
        prefixItems: {
          $ref: '#/$defs/schemaArray',
        },
        items: {
          $ref: '#/$defs/jsonSchema',
        },
        contains: {
          $ref: '#/$defs/jsonSchema',
        },
        maxItems: {
          $ref: '#/$defs/nonNegativeInteger',
        },
        minItems: {
          $ref: '#/$defs/nonNegativeIntegerDefault0',
        },
        uniqueItems: {
          type: 'boolean',
          default: false,
        },
        maxContains: {
          $ref: '#/$defs/nonNegativeInteger',
        },
        minContains: {
          $ref: '#/$defs/nonNegativeInteger',
          default: 1,
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
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/meta-data': true,
      },
      title: 'Meta-data vocabulary meta-schema',
      type: ['object', 'boolean'],
      properties: {
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
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
        examples: {
          type: 'array',
          items: true,
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
