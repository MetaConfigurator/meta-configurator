import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import type {Path} from "@/utility/path";
import {dataAt} from "@/utility/resolveDataAtPath";
import type {JsonSchemaWrapper} from "@/schema/jsonSchemaWrapper";

export function getColorForMode(mode: string, settings: SettingsInterfaceRoot): string {
  const settingsAsAny: any = settings;
  return settingsAsAny.uiColors[mode];
}




// TODO: add setting to synchronize schema changes in GUI with data: if property renamed/deleted, do same with data
export function replacePropertyNameUtils(subPath: Path, oldName: string, newName: string, currentData: any, currentSchema: JsonSchemaWrapper, updateDataFct: (subPath: Path, newValue: any) => void): Path{
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

  const newRelativePath = parentPath.concat([newName]);
  return newRelativePath
}

function initializeNewProperty(parentPath: Path, name: string, currentSchema: JsonSchemaWrapper): any {
  const schema = currentSchema.subSchemaAt(parentPath.concat([name]));
  return schema?.initialValue();
}
