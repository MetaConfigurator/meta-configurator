import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {Path} from '@/utility/path';
import {dataAt} from '@/utility/resolveDataAtPath';

export function writeSchemaRequiredDefaultsToData(
  data: any,
  path: Path,
  schema: JsonSchemaWrapper,
  updateDataFct: (path: Path, newValue: any) => void
) {
  // safeguard to not go into infinite recursion
  if (path.length > 12) {
    return;
  }
  let document = dataAt(path, data);
  if (document === undefined) {
    document = {};
    updateDataFct(path, document);
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
            updateDataFct(path.concat(propertyName), property.default);
          } else {
            if (property.hasType('object')) {
              writeSchemaRequiredDefaultsToData(
                data,
                path.concat(propertyName),
                property,
                updateDataFct
              );
            } else if (property.hasType('array')) {
              if (property.items && property.minItems > 0) {
                writeSchemaRequiredDefaultsToData(
                  data,
                  path.concat(propertyName, '0'),
                  property.items,
                  updateDataFct
                );
              }
            }
          }
        }
      }
    }
  }
}
