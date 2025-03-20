import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {ManagedData} from '@/data/managedData';
import type {Path} from '@/utility/path';

export function writeSchemaRequiredDefaultsToData(
  data: ManagedData,
  path: Path,
  schema: JsonSchemaWrapper
) {
  // safeguard to not go into infinite recursion
  if (path.length > 12) {
    return;
  }
  let document = data.dataAt(path);
  if (document === undefined) {
    document = {};
    data.setDataAt(path, document);
  }
  // for schema properties which are required, write the default value to the data object if it is not already set
  const schemaProperties = schema.properties;
  const requiredProperties = schema.required;
  if (schemaProperties) {
    for (const propertyName in schemaProperties) {
      const property = schemaProperties[propertyName];
      if (requiredProperties.includes(propertyName)) {
        if (!document[propertyName]) {
          if (property.default) {
            data.setDataAt(path.concat(propertyName), property.default);
          } else {
            if (property.hasType('object')) {
              writeSchemaRequiredDefaultsToData(data, path.concat(propertyName), property);
            } else if (property.hasType('array')) {
              if (property.items && property.minItems > 0) {
                writeSchemaRequiredDefaultsToData(
                  data,
                  path.concat(propertyName, '0'),
                  property.items
                );
              }
            }
          }
        }
      }
    }
  }
}
