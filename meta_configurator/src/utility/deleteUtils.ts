import type {ManagedData} from '@/data/managedData';
import type {Path} from '@/utility/path';
import {getParentElementRequiredPropsPath} from '@/utility/pathUtils';

export function deleteSchemaElement(schema: ManagedData, absolutePath: Path) {
  schema.removeDataAt(absolutePath);

  // check whether the element has a parent element and if yes, remove the deleted property from the list of required props
  const parentRequiredPropsPath = getParentElementRequiredPropsPath(
    schema.data.value,
    absolutePath
  );
  if (parentRequiredPropsPath) {
    const requiredProps = schema.dataAt(parentRequiredPropsPath);
    const schemaElementName = absolutePath[absolutePath.length - 1];
    const requiredIndex = requiredProps.indexOf(schemaElementName);
    if (requiredIndex !== -1) {
      const updatedRequiredProps = requiredProps.filter(
        (_: string, index: number) => index !== requiredIndex
      );
      schema.setDataAt(parentRequiredPropsPath, updatedRequiredProps);
    }
  }
}
