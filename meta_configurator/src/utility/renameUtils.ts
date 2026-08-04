import type {Path} from '@/utility/path';
import {dataAt} from '@/utility/resolveDataAtPath';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {getParentElementRequiredPropsPath, pathToJsonPointer} from '@/utility/pathUtils';
import {removeFromRequiredArray} from '@/utility/requiredUtils';
import {SessionMode} from '@/store/sessionMode';
import {confirmationService} from '@/utility/confirmationService';

const RENAME_CONFLICT_ACTION = {
  CANCEL: 'cancel',
  OVERWRITE: 'overwrite',
  KEEP_DATA_UNCHANGED: 'keep-data-unchanged',
} as const;

let isPromptingForConflict = false;

function shouldPromptForRenameConflict(
  currentData: any,
  parentPath: Path,
  oldName: string,
  newName: string
): boolean {
  if (oldName === newName) {
    return false;
  }

  const parentData = dataAt(parentPath, currentData);
  if (!parentData || typeof parentData !== 'object' || Array.isArray(parentData)) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(parentData, newName);
}

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
  if (shouldPromptForRenameConflict(currentData, parentPath, oldName, newName)) {
    if (isPromptingForConflict) {
      return path;
    }

    isPromptingForConflict = true;

    confirmationService.require({
      message: `The data already contains a field named "${newName}" at this location. Renaming would overwrite it. Choose how to proceed.`,
      header: 'Rename conflict',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Proceed and overwrite data',
      rejectLabel: 'Proceed but keep existing data',
      accept: () => {
        isPromptingForConflict = false;
        applyRenameToData(
          parentPath,
          oldName,
          newName,
          currentData,
          currentSchema,
          updateDataFct,
          RENAME_CONFLICT_ACTION.OVERWRITE
        );
      },
      reject: () => {
        isPromptingForConflict = false;
        applyRenameToData(
          parentPath,
          oldName,
          newName,
          currentData,
          currentSchema,
          updateDataFct,
          RENAME_CONFLICT_ACTION.KEEP_DATA_UNCHANGED
        );
      },
      onHide: () => {
        isPromptingForConflict = false;
      },
    });

    return path;
  }

  applyRenameToData(
    parentPath,
    oldName,
    newName,
    currentData,
    currentSchema,
    updateDataFct,
    RENAME_CONFLICT_ACTION.OVERWRITE
  );

  return parentPath.concat([newName]);
}
function applyRenameToData(
  parentPath: Path,
  oldName: string,
  newName: string,
  currentData: any,
  currentSchema: JsonSchemaWrapper,
  updateDataFct: (subPath: Path, newValue: any) => void,
  action: typeof RENAME_CONFLICT_ACTION[keyof typeof RENAME_CONFLICT_ACTION] = RENAME_CONFLICT_ACTION.OVERWRITE
) {
  let dataAtParentPath = dataAt(parentPath, currentData) ?? {};
  dataAtParentPath = structuredClone(dataAtParentPath);

  if (action === RENAME_CONFLICT_ACTION.KEEP_DATA_UNCHANGED) {
    // Option C: Keep existing target property data ("name") untouched
  } else {
    // Option B: Overwrite target key with old key's value
    dataAtParentPath = updateKeyName(dataAtParentPath, oldName, newName);
  }

  if (dataAt([newName], dataAtParentPath) === undefined) {
    dataAtParentPath[newName] = initializeNewProperty(parentPath, newName, currentSchema);
  }

  updateDataFct(parentPath, { ...dataAtParentPath });
  updateReferences(
    parentPath.concat([oldName]),
    parentPath.concat([newName]),
    currentData,
    updateDataFct
  );

  if (currentSchema.mode === SessionMode.SchemaEditor) {
    updateParentRequiredPropsValue(currentData, parentPath, oldName, newName, updateDataFct);
  }
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
    const updatedRequiredProps = removeFromRequiredArray(requiredProps, oldPropertyName);
    if (updatedRequiredProps !== requiredProps) {
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
