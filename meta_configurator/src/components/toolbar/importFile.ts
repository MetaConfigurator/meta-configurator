import {useFileDialog} from '@vueuse/core';
import {readFileContentForFunction} from '@/utility/readFileContent';
import {getDataForMode} from "@/data/useDataLink";
import {SessionMode} from "@/store/sessionMode";
import type {ManagedData} from "@/data/managedData";
import {findAvailableSchemaId} from "@/schema/schemaReadingUtils";


/**
 * Opens a file dialog to select a JSON schema to import.
 */
export function openImportSchemaDialog(): void {

  const {open, onChange} = useFileDialog();

  onChange((files: FileList | null) => {
   readFileContentForFunction(files, importSchema);
  });

  open();
}


function importSchema(schemaString: string) {
  const importedSchema = JSON.parse(schemaString);
  const currentUserSchema = getDataForMode(SessionMode.SchemaEditor);

  copyDefinitionsToUserSchema(currentUserSchema, importedSchema, '$defs');
    copyDefinitionsToUserSchema(currentUserSchema, importedSchema, 'definitions');

    const rootElement = importedSchema;
    // delete definitions of root element
    delete rootElement.$defs;
    delete rootElement.definitions;
  // copy all properties of root element to a sub element in the schema
    const newRootElementId = findAvailableSchemaId(currentUserSchema, ['$defs'], 'importedSchema', true);
    currentUserSchema.setDataAt(newRootElementId, rootElement);

}

function copyDefinitionsToUserSchema(userSchema: ManagedData, importedSchema: any, type: '$defs'|'definitions') {
    const existingDefs = userSchema.data.value[type] || {};
    const newDefs = importedSchema[type] || {};

    const newDefsRenamed: any = renameDuplicatesInObject(newDefs, Object.keys(existingDefs));
    const mergedDefs = {...existingDefs, ...newDefsRenamed};
    userSchema.setDataAt([type], mergedDefs);
}

function renameDuplicatesInObject(obj: any, existingKeys: string[]) {
    const result: any = {};
    for (const key in obj) {
        let newKey = key;
        let i = 1;
        while (existingKeys.includes(newKey)) {
            newKey = key + i;
            i++;
        }
        result[newKey] = obj[key];
    }
    return result;
}