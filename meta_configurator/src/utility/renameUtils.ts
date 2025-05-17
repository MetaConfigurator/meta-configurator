import type {Path} from '@/utility/path';
import {dataAt} from '@/utility/resolveDataAtPath';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {getParentElementRequiredPropsPath, pathToJsonPointer} from '@/utility/pathUtils';
import {SessionMode} from '@/store/sessionMode';

export function replacePropertyNameUtils(
  // relative or absolute path (depending on the provided data) to the property to rename
  path: Path,
  oldName: string,
  newName: string,
  currentData: any,
  currentSchema: JsonSchemaWrapper,
  updateDataFct: (subPath: Path, newValue: any) => void
) {
  const parentPath = path.slice(0, -1);
  let dataAtParentPath = dataAt(parentPath, currentData) ?? {};
  // note: cloning the data before adjusting it, because otherwise the original data would already be changed and then the updateData call would detect a change and not trigger the ref
  dataAtParentPath = structuredClone(dataAtParentPath);
  dataAtParentPath = updateKeyName(dataAtParentPath, oldName, newName);

  if (dataAt([newName], dataAtParentPath) === undefined) {
    dataAtParentPath[newName] = initializeNewProperty(parentPath, newName, currentSchema);
  }

  updateDataFct(parentPath, dataAtParentPath);
  updateReferences(
    parentPath.concat([oldName]),
    parentPath.concat([newName]),
    currentData,
    updateDataFct
  );

  if (currentSchema.mode == SessionMode.SchemaEditor) {
    updateParentRequiredPropsValue(currentData, parentPath, oldName, newName, updateDataFct);
  }

  return parentPath.concat([newName]);
}

function updateKeyName(object: any, oldKey: string, newKey: string): any {
  let modifiedObj: any = {};

  for (let [k, v] of Object.entries(object))
    if (k === oldKey) modifiedObj[newKey] = v;
    else modifiedObj[k] = v;

  return modifiedObj;
}

export function updateParentRequiredPropsValue(
  schemaData: any,
  parentPath: Path,
  oldPropertyName: string,
  newPropertyName: string,
  updateDataFct: (subPath: Path, newValue: any) => void
) {
  const parentRequiredPropsPath = getParentElementRequiredPropsPath(
    schemaData,
    parentPath.concat([oldPropertyName])
  );
  if (parentRequiredPropsPath) {
    const requiredProps = dataAt(parentRequiredPropsPath, schemaData) ?? [];
    const requiredIndex = requiredProps.indexOf(oldPropertyName);
    if (requiredIndex !== -1) {
      const updatedRequiredProps = requiredProps.filter(
        (_: string, index: number) => index !== requiredIndex
      );
      updatedRequiredProps.push(newPropertyName);
      updateDataFct(parentRequiredPropsPath, updatedRequiredProps);
    }
  }
}
export function updateReferences(
  oldPath: Path,
  newPath: Path,
  currentData: any,
  updateDataFct: (subPath: Path, newValue: any) => void
) {
  const oldPathStr = pathToJsonPointer(oldPath);
  const newPathStr = pathToJsonPointer(newPath);

  const oldRef = '#' + oldPathStr;
  const newRef = '#' + newPathStr;

  const references = findReferences(oldPathStr, currentData);
  references.forEach((ref: any) => {
    const refPath = ref.path;
    const refValue = ref.value;
    const updatedRefValue = refValue.replace(
      new RegExp(escapeRegex(oldRef) + '(\\b|$)', 'g'),
      newRef
    );
    updateDataFct(refPath, updatedRefValue);
  });
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findReferences(oldPath: string, currentData: any): any[] {
  const references: any[] = [];
  findReferencesRecursive(oldPath, currentData, [], references);
  return references;
}

function findReferencesRecursive(
  searchReference: string,
  currentData: any,
  currentPath: Path,
  references: any[]
) {
  if (typeof currentData === 'object') {
    for (const key in currentData) {
      const value = currentData[key];
      const newPath = currentPath.concat([key]);
      if (typeof value === 'string') {
        if (value.includes(searchReference) && key === '$ref') {
          references.push({path: newPath, value: value});
        }
      } else {
        findReferencesRecursive(searchReference, value, newPath, references);
      }
    }
  }
}

function initializeNewProperty(
  parentPath: Path,
  name: string,
  currentSchema: JsonSchemaWrapper
): any {
  const schema = currentSchema.subSchemaAt(parentPath.concat([name]));
  return schema?.initialValue();
}
