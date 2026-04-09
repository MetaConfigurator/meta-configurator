import type {ManagedData} from '@/data/managedData';
import type {Path} from '@/utility/path';
import {getParentElementRequiredPropsPath} from '@/utility/pathUtils';
import {removeFromRequiredArray} from '@/utility/requiredUtils';

export function deleteSchemaElement(schema: ManagedData, absolutePath: Path) {
  schema.removeDataAt(absolutePath);

  // check whether the element has a parent element and if yes, remove the deleted property from the list of required props
  const parentRequiredPropsPath = getParentElementRequiredPropsPath(
    schema.data.value,
    absolutePath
  );
  if (parentRequiredPropsPath) {
    const requiredProps = schema.dataAt(parentRequiredPropsPath);
    const schemaElementName = absolutePath[absolutePath.length - 1] as string;
    const updatedRequiredProps = removeFromRequiredArray(requiredProps, schemaElementName);
    if (updatedRequiredProps !== requiredProps) {
      schema.setDataAt(parentRequiredPropsPath, updatedRequiredProps);
    }
  }
}
