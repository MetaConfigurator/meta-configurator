import type {GuiEditorTreeNode} from "@/components/panels/gui-editor/configDataTreeNode.ts";

export function isStructuralChangeInInstance(oldObject: any, newObject: any): boolean {
  // algorithm to determine whether any key or structure has changed between oldObject and newObject
  // changes in values of existing keys are not considered structural changes
  // the element might also be an array, in which case we need to check for changes in the length of the array and the keys of the objects in the array
  // also this algorithm is recursive, so if there are nested objects or arrays, we need to check for structural changes in those as well

  // if both are of primitive type, we can skip the check for structural changes
  if (isOfPrimitiveType(oldObject) && isOfPrimitiveType(newObject)) {
    return false;
  }

  // otherwise, if the types of oldObject and newObject are different, we can consider it a structural change
  if (typeof oldObject !== typeof newObject) {
    return true;
  }

  // logic for arrays
  if (Array.isArray(oldObject) && Array.isArray(newObject)) {
    if (oldObject.length !== newObject.length) {
      return true;
    }
    for (let i = 0; i < oldObject.length; i++) {
      if (isStructuralChangeInInstance(oldObject[i], newObject[i])) {
        return true;
      }
    }
    return false;
  }

  // logic for objects
  if (typeof oldObject === 'object' && oldObject !== null && newObject !== null) {
    const oldKeys = Object.keys(oldObject);
    const newKeys = Object.keys(newObject);

    if (oldKeys.length !== newKeys.length) {
      return true;
    }

    for (const key of oldKeys) {
      if (!newKeys.includes(key)) {
        return true;
      }
      if (isStructuralChangeInInstance(oldObject[key], newObject[key])) {
        return true;
      }
    }
  }

  return false;

}

function isOfPrimitiveType(value: any): boolean {
  return (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null);
}