import type {JsonSchemaType} from '@/schema/jsonSchemaType';
import _ from 'lodash';

/** Apply constants from a selected, merged schema without mutating data or schema. */
export function applySchemaConstantsOnData(schema: JsonSchemaType, data: any): any {
  if (schema === null || typeof schema !== 'object') {
    return data;
  }
  // Pre-processing converts const to a singleton enum. Apply it before checking
  // the data type: constants can replace missing values and primitive values too.
  if (schema.enum?.length === 1) {
    return _.cloneDeep(schema.enum[0]);
  }

  const types = schema.type === undefined ? undefined : [schema.type].flat();
  // `properties` only constrains objects. Do not synthesize one when the schema
  // excludes objects, or replace an explicit null that the schema permits.
  if (types && (!types.includes('object') || (data === null && types.includes('null')))) {
    return data;
  }

  if (data !== undefined && data !== null && (typeof data !== 'object' || Array.isArray(data))) {
    return data;
  }

  if (schema.properties) {
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      if (propertySchema === undefined) continue;
      const previousValue = data?.[key];
      const value = applySchemaConstantsOnData(propertySchema, previousValue);
      if (!_.isEqual(value, previousValue)) {
        // Only create an absent object when a descendant actually has a constant.
        // Copy rather than mutate props so the caller detects and emits the change.
        data = {...data, [key]: value};
      }
    }
  }
  return data;
}
