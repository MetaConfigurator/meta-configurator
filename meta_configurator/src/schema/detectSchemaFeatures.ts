import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';

export type SchemaFeatures = {
  composition: boolean;
  conditionals: boolean;
  defaultValues: boolean;
  exampleValues: boolean;
  enums: boolean;
  constants: boolean;
  multipleTypes: boolean;
  references: boolean;
  required: boolean;
  negation: boolean;
  booleanSchemas: boolean;
  descriptions: boolean;
  titles: boolean;
  // on purpose, we currently do not track whether it uses constraints (e.g., maxLength, minLength, etc.) because there are so many of them and for our use case we do not need to know about them
};

export function detectSchemaFeatures(jsonSchema: TopLevelSchema): SchemaFeatures {
  const features: SchemaFeatures = {
    composition: false, // oneOf, anyOf, allOf
    conditionals: false, // if, then, else
    defaultValues: false,
    exampleValues: false,
    enums: false,
    constants: false,
    multipleTypes: false,
    references: false,
    required: false,
    negation: false,
    booleanSchemas: false, // when a sub-schema is simply true or false instead of an object
    descriptions: false,
    titles: false,
  };

  // detect features for root level schema
  detectSubSchemaFeatures(jsonSchema, features);

  // detect features for all $defs and definitions
  if (jsonSchema.$defs) {
    for (const key in jsonSchema.$defs) {
      detectSubSchemaFeatures(jsonSchema.$defs[key], features);
    }
  }
  if (jsonSchema.definitions) {
    for (const key in jsonSchema.definitions) {
      detectSubSchemaFeatures(jsonSchema.definitions[key], features);
    }
  }

  return features;
}

function detectSubSchemaPropertiesFeatures(subSchema: JsonSchemaType, features: SchemaFeatures) {
  // the sub schema will be either true, false or a dictionary of keys that map to a sub schema
  // this function will be called for properties, patternProperties each
  if (typeof subSchema === 'object' && !Array.isArray(subSchema)) {
    for (const key in subSchema) {
      detectSubSchemaFeatures(subSchema[key], features);
    }
  } else if (subSchema === true || subSchema === false) {
    features.booleanSchemas = true;
  }
}

function detectSubSchemaFeatures(subSchema: JsonSchemaType, features: SchemaFeatures) {
  if (subSchema == true || subSchema == false) {
    features.booleanSchemas = true;
  } else {
    detectSubObjectSchemaFeatures(subSchema, features);
  }
}

function detectSubObjectSchemaFeatures(subSchema: JsonSchemaObjectType, features: SchemaFeatures) {
  // Check for composition
  if ('oneOf' in subSchema || 'anyOf' in subSchema || 'allOf' in subSchema) {
    features.composition = true;

    if ('oneOf' in subSchema) {
      detectSchemaFeatures(subSchema.oneOf);
    }
    if ('anyOf' in subSchema) {
      detectSchemaFeatures(subSchema.anyOf);
    }
    if ('allOf' in subSchema) {
      detectSchemaFeatures(subSchema.allOf);
    }
  }

  // Check for conditionals
  if ('if' in subSchema || 'then' in subSchema || 'else' in subSchema) {
    features.conditionals = true;

    if ('if' in subSchema) {
      detectSubSchemaFeatures(subSchema.if, features);
    }
    if ('then' in subSchema) {
      detectSubSchemaFeatures(subSchema.then, features);
    }
    if ('else' in subSchema) {
      detectSubSchemaFeatures(subSchema.else, features);
    }
  }

  // Check for default values
  if (subSchema.default) {
    features.defaultValues = true;
  }

  // Check for example values
  if (subSchema.examples) {
    features.exampleValues = true;
  }

  // Check for enums
  if (subSchema.enum) {
    features.enums = true;
  }

  // Check for constants
  if (subSchema.const) {
    features.constants = true;
  }

  // Check for multiple types
  if (Array.isArray(subSchema.type)) {
    features.multipleTypes = true;
  }

  // Check for references
  if (subSchema.$ref) {
    features.references = true;
  }

  // Check for required properties
  if (subSchema.required) {
    features.required = true;
  }

  // Check for negation
  if (subSchema.not) {
    features.negation = true;
  }

  // Check for descriptions
  if (subSchema.description) {
    features.descriptions = true;
  }

  // Check for titles
  if (subSchema.title) {
    features.titles = true;
  }

  // recursively check for features in properties and patternProperties and additionalProperties
  if ('properties' in subSchema) {
    detectSubSchemaPropertiesFeatures(subSchema.properties, features);
  }
  if ('patternProperties' in subSchema) {
    detectSubSchemaPropertiesFeatures(subSchema.patternProperties, features);
  }
  if ('additionalProperties' in subSchema) {
    detectSubSchemaFeatures(subSchema.additionalProperties, features);
  }

  // recursively check for items in case of arrays
  if (Array.isArray(subSchema.items)) {
    subSchema.items.forEach(item => {
      detectSubSchemaFeatures(item, features);
    });
  } else if (subSchema.items) {
    detectSubSchemaFeatures(subSchema.items, features);
  }
}
