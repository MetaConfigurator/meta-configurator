export const jsonSchemaMetaSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://json-schema.org/draft/2020-12/schema',
  $vocabulary: {
    'https://json-schema.org/draft/2020-12/meta/core': true,
    'https://json-schema.org/draft/2020-12/meta/applicator': true,
    'https://json-schema.org/draft/2020-12/meta/unevaluated': true,
    'https://json-schema.org/draft/2020-12/meta/validation': true,
    'https://json-schema.org/draft/2020-12/meta/meta-data': true,
    'https://json-schema.org/draft/2020-12/meta/format-annotation': true,
    'https://json-schema.org/draft/2020-12/meta/format-assertion': true,
    'https://json-schema.org/draft/2020-12/meta/content': true,
  },
  $dynamicAnchor: 'meta',
  title: 'Json schema meta-schema',
  allOf: [
    {
      $ref: '#/$defs/core',
    },
    {
      $ref: '#/$defs/applicator',
    },
    {
      $ref: '#/$defs/unevaluated',
    },
    {
      $ref: '#/$defs/validation',
    },
    {
      $ref: '#/$defs/meta-data',
    },
    {
      $ref: '#/$defs/format-annotation',
    },
    {
      $ref: '#/$defs/content',
    },
  ],
  type: ['object', 'boolean'],
  $comment:
    'This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.',
  properties: {
    definitions: {
      $comment: '"definitions" has been replaced by "$defs".',
      type: 'object',
      additionalProperties: {
        $dynamicRef: '#meta',
      },
      deprecated: true,
      default: {},
    },
    dependencies: {
      $comment:
        '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
      type: 'object',
      additionalProperties: {
        anyOf: [
          {
            $dynamicRef: '#meta',
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
    $recursiveAnchor: {
      $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
      type: 'string',
      pattern: '^[A-Za-z_][-A-Za-z0-9._]*$',
      deprecated: true,
    },
    $recursiveRef: {
      $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
      type: 'string',
      format: 'uri-reference',
      deprecated: true,
    },
  },
  $defs: {
    core: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://json-schema.org/draft/2020-12/meta/core',
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/core': true,
      },
      $dynamicAnchor: 'meta',
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
        $ref: {
          $ref: '#/$defs/uriReferenceString',
        },
        $anchor: {
          $ref: '#/$defs/anchorString',
        },
        $dynamicRef: {
          $ref: '#/$defs/uriReferenceString',
        },
        $dynamicAnchor: {
          $ref: '#/$defs/anchorString',
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
            $dynamicRef: '#meta',
          },
        },
      },
    },
    applicator: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://json-schema.org/draft/2020-12/meta/applicator',
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/applicator': true,
      },
      $dynamicAnchor: 'meta',
      title: 'Applicator vocabulary meta-schema',
      type: ['object', 'boolean'],
      properties: {
        prefixItems: {
          $ref: '#/$defs/schemaArray',
        },
        items: {
          $dynamicRef: '#meta',
        },
        contains: {
          $dynamicRef: '#meta',
        },
        additionalProperties: {
          $dynamicRef: '#meta',
        },
        properties: {
          type: 'object',
          additionalProperties: {
            $dynamicRef: '#meta',
          },
          default: {},
        },
        patternProperties: {
          type: 'object',
          additionalProperties: {
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
            $dynamicRef: '#meta',
          },
          default: {},
        },
        propertyNames: {
          $dynamicRef: '#meta',
        },
        if: {
          $dynamicRef: '#meta',
        },
        then: {
          $dynamicRef: '#meta',
        },
        else: {
          $dynamicRef: '#meta',
        },
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
          $dynamicRef: '#meta',
        },
      },
    },
    unevaluated: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://json-schema.org/draft/2020-12/meta/unevaluated',
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/unevaluated': true,
      },
      $dynamicAnchor: 'meta',
      title: 'Unevaluated applicator vocabulary meta-schema',
      type: ['object', 'boolean'],
      properties: {
        unevaluatedItems: {
          $dynamicRef: '#meta',
        },
        unevaluatedProperties: {
          $dynamicRef: '#meta',
        },
      },
    },
    validation: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://json-schema.org/draft/2020-12/meta/validation',
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/validation': true,
      },
      $dynamicAnchor: 'meta',
      title: 'Validation vocabulary meta-schema',
      type: ['object', 'boolean'],
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
      },
    },
    'meta-data': {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://json-schema.org/draft/2020-12/meta/meta-data',
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/meta-data': true,
      },
      $dynamicAnchor: 'meta',
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
    'format-annotation': {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://json-schema.org/draft/2020-12/meta/format-annotation',
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/format-annotation': true,
      },
      $dynamicAnchor: 'meta',
      title: 'Format vocabulary meta-schema for annotation results',
      type: ['object', 'boolean'],
      properties: {
        format: {
          type: 'string',
        },
      },
    },
    content: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://json-schema.org/draft/2020-12/meta/content',
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/content': true,
      },
      $dynamicAnchor: 'meta',
      title: 'Content vocabulary meta-schema',
      type: ['object', 'boolean'],
      properties: {
        contentEncoding: {
          type: 'string',
        },
        contentMediaType: {
          type: 'string',
        },
        contentSchema: {
          $dynamicRef: '#meta',
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
        $dynamicRef: '#meta',
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
