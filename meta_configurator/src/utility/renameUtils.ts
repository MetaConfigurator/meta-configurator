import type {Path} from '@/utility/path';
import {dataAt} from '@/utility/resolveDataAtPath';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {
  getParentElementRequiredPropsPath,
  pathToJsonPointer,
} from '@/utility/pathUtils';
import {findDataPathsUsingSchema} from '@/schema/schemaDataPathResolver';
import {removeFromRequiredArray} from '@/utility/requiredUtils';
import {SessionMode} from '@/store/sessionMode';
import {confirmationService} from '@/utility/confirmationService';
import {sizeOf} from '@/utility/sizeOf';
import {useSettings} from '@/settings/useSettings';

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

// Applies the rename decision (overwrite / keep-unchanged) to every affected data

function syncPropertyRenameToInstanceData(
  schemaObjectPath: Path,
  oldName: string,
  newName: string,
  action: (typeof RENAME_CONFLICT_ACTION)[keyof typeof RENAME_CONFLICT_ACTION],
  schemaRoot: any,
  instanceData: any,
  updateInstanceDataFct: (subPath: Path, newValue: any) => void
) {
  if (
    sizeOf(schemaRoot) >
    useSettings().value.performance.maxSchemaSizeForDataSynchronization
  ) {
    return;
  }

  const affectedDataPaths = findDataPathsUsingSchema(schemaObjectPath, instanceData, schemaRoot);
  console.log(
    pathToJsonPointer(schemaObjectPath),
    '-> affected:',
    affectedDataPaths.map(pathToJsonPointer)
  );

  for (const dataPath of affectedDataPaths) {
    const obj = dataAt(dataPath, instanceData);
    if (!obj || typeof obj !== 'object' || !Object.prototype.hasOwnProperty.call(obj, oldName)) {
      continue;
    }

    let updated;
    if (action === RENAME_CONFLICT_ACTION.KEEP_DATA_UNCHANGED) {
      updated = structuredClone(obj);
      delete updated[oldName];
    } else {
      updated = updateKeyName(structuredClone(obj), oldName, newName);
    }

    console.log(action, 'at', pathToJsonPointer(dataPath));
    updateInstanceDataFct(dataPath, updated);
  }
}

export function replacePropertyNameUtils(
  // relative or absolute path (depending on the provided data) to the property to rename
  path: Path,
  oldName: string,
  newName: string,
  currentData: any,
  currentSchema: JsonSchemaWrapper,
  updateDataFct: (subPath: Path, newValue: any) => void,
  instanceData?: any,
  updateInstanceDataFct?: (subPath: Path, newValue: any) => void
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
          RENAME_CONFLICT_ACTION.OVERWRITE,
          instanceData,
          updateInstanceDataFct
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
          RENAME_CONFLICT_ACTION.KEEP_DATA_UNCHANGED,
          instanceData,
          updateInstanceDataFct
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
    RENAME_CONFLICT_ACTION.OVERWRITE,
    instanceData,
    updateInstanceDataFct
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
  action: (typeof RENAME_CONFLICT_ACTION)[keyof typeof RENAME_CONFLICT_ACTION] = RENAME_CONFLICT_ACTION.OVERWRITE,
  instanceData?: any,
  updateInstanceDataFct?: (subPath: Path, newValue: any) => void
) {
  let dataAtParentPath = dataAt(parentPath, currentData) ?? {};
  dataAtParentPath = structuredClone(dataAtParentPath);

  if (action === RENAME_CONFLICT_ACTION.KEEP_DATA_UNCHANGED) {
    // Option C: drop the old key,Keep existing target property data ("name") untouched
    delete dataAtParentPath[oldName];
  } else {
    // Option B: Overwrite target key with old key's value
    dataAtParentPath = updateKeyName(dataAtParentPath, oldName, newName);
  }

  if (dataAt([newName], dataAtParentPath) === undefined) {
    dataAtParentPath[newName] = initializeNewProperty(parentPath, newName, currentSchema);
  }

  updateDataFct(parentPath, {...dataAtParentPath});
  updateReferences(
    parentPath.concat([oldName]),
    parentPath.concat([newName]),
    currentData,
    updateDataFct
  );

  if (currentSchema.mode === SessionMode.SchemaEditor) {
    updateParentRequiredPropsValue(currentData, parentPath, oldName, newName, updateDataFct);
  }
  if (instanceData !== undefined && updateInstanceDataFct !== undefined) {
    const schemaObjectPath =
      parentPath[parentPath.length - 1] === 'properties' ? parentPath.slice(0, -1) : parentPath;
    syncPropertyRenameToInstanceData(
      schemaObjectPath,
      oldName,
      newName,
      action,
      currentData,
      instanceData,
      updateInstanceDataFct
    );
  }
}

// Rebuilds object with oldKey replaced by newKey. Rewritten (not renamed in-place while  iterating) because the old version could get overwritten if newKey already existed
// later in the same object's key order.
function updateKeyName(object: any, oldKey: string, newKey: string): any {
  const modifiedObj: any = {};

  const oldValue = object[oldKey];

  for (const [k, v] of Object.entries(object)) {
    if (k === oldKey) continue;
    modifiedObj[k] = v;
  }
  modifiedObj[newKey] = oldValue; // always wins, regardless of original key order

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
