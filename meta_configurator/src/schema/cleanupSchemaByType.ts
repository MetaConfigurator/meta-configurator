import {CONSTRAINED_KEYWORDS} from './supportedJsonSchemaTypeKeywords';
import type {SchemaPropertyType} from '@/schema/jsonSchemaType.ts';

export function cleanupSchemaByType(schema: Record<string, any>, type: SchemaPropertyType) {
  Object.keys(schema).forEach(key => {
    if (key in CONSTRAINED_KEYWORDS) {
      const supportedTypesForProperty = CONSTRAINED_KEYWORDS[key]!;
      if (!supportedTypesForProperty.includes(type)) {
        delete schema[key];
      }
    }
  });
}
