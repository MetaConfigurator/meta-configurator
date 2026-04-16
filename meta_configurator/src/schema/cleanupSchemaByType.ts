import {SUPPORTED_KEYWORDS} from './supportedJsonSchemaTypeKeywords';
import type {JsonSchemaType} from './supportedJsonSchemaTypeKeywords';
export function cleanupSchemaByType(schema: Record<string, any>, type: JsonSchemaType | '$ref') {
  let allowed: string[];

  if (type === '$ref') {
    allowed = ['$ref', 'title', 'description', 'default', 'examples'];
  } else {
    allowed = SUPPORTED_KEYWORDS[type];
  }

  Object.keys(schema).forEach(key => {
    if (!allowed.includes(key) && key !== 'type') {
      delete schema[key];
    }
  });
}
