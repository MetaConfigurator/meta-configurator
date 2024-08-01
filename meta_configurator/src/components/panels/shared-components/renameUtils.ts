import type {Path} from '@/utility/path';
import {dataAt} from '@/utility/resolveDataAtPath';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {pathToJsonPointer} from '@/utility/pathUtils';

// TODO: add setting to synchronize schema changes in GUI with data: if property renamed/deleted, do same with data
export function replacePropertyNameUtils2(
  subPath: Path,
  oldName: string,
  newName: string,
  currentData: any,
  currentSchema: JsonSchemaWrapper,
  updateDataFct: (subPath: Path, newValue: any) => void
): Path {
  if (oldName === newName) {
    return subPath;
  }
  let oldPropertyData = dataAt(subPath, currentData);
  const parentPath = subPath.slice(0, -1);

  // note: cloning the data before adjusting it, because otherwise the original data would already be changed and then the updateData call would detect a change and not trigger the ref
  let dataAtParentPath = dataAt(parentPath, currentData) ?? {};
  dataAtParentPath = structuredClone(dataAtParentPath);

  if (oldPropertyData === undefined) {
    oldPropertyData = initializeNewProperty(parentPath, newName, currentSchema);
  } else {
    delete dataAtParentPath[oldName];
  }

  dataAtParentPath[newName] = oldPropertyData;

  updateDataFct(parentPath, dataAtParentPath);
  updateReferences(
    parentPath.concat([oldName]),
    parentPath.concat([newName]),
    currentData,
    updateDataFct
  );

  return parentPath.concat([newName]);
}

export function replacePropertyNameUtils(
  subPath: Path,
  oldName: string,
  newName: string,
  currentData: any,
  currentSchema: JsonSchemaWrapper,
  updateDataFct: (subPath: Path, newValue: any) => void
) {
  const parentPath = subPath.slice(0, -1);
  let dataAtParentPath = dataAt(parentPath, currentData) ?? {};
  // note: cloning the data before adjusting it, because otherwise the original data would already be changed and then the updateData call would detect a change and not trigger the ref
  dataAtParentPath = structuredClone(dataAtParentPath);
  dataAtParentPath = updateKeyName(dataAtParentPath, oldName, newName);

  updateDataFct(parentPath, dataAtParentPath);
  updateReferences(
    parentPath.concat([oldName]),
    parentPath.concat([newName]),
    currentData,
    updateDataFct
  );

  return parentPath.concat([newName]);
}

function updateKeyName(object: any, oldKey: string, newKey: string): any {
  let modifiedObj: any = {};

  for (let [k, v] of Object.entries(object))
    if (k === oldKey) modifiedObj[newKey] = v;
    else modifiedObj[k] = v;

  return modifiedObj;
}

function updateReferences(
  oldPath: Path,
  newPath: Path,
  currentData: any,
  updateDataFct: (subPath: Path, newValue: any) => void
) {
  const oldPathStr = pathToJsonPointer(oldPath);
  const newPathStr = pathToJsonPointer(newPath);

  const references = findReferences(oldPathStr, currentData);
  references.forEach((ref: any) => {
    const refPath = ref.path;
    const refValue = ref.value;
    const updatedRefValue = refValue.replace(oldPathStr, newPathStr);
    updateDataFct(refPath, updatedRefValue);
  });
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
