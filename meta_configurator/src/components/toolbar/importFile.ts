import {useFileDialog} from '@vueuse/core';
import {readFileContentForFunction} from '@/utility/readFileContent';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import type {ManagedData} from '@/data/managedData';
import {findAvailableSchemaId} from '@/schema/schemaReadingUtils';

/**
 * Opens a file dialog to select a JSON schema to import.
 */
export function openImportSchemaDialog(): void {
  const {open, onChange, reset} = useFileDialog({
    // accept only json, schema.json, yaml, yml, xml and xsd files
    accept: '.json, .yaml, .yml, .xml, .schema.json',
    multiple: false,
  });

  onChange((files: FileList | null) => {
    readFileContentForFunction(files, importSchema);
    reset(); // Reset the file dialog after selection
  });

  // opening it with a small delay might fix the issue of the dialog opening but onChange never triggering
  setTimeout(() => {
    open();
  }, 5);
}

function importSchema(importedSchema: any) {
  const currentUserSchema = getDataForMode(SessionMode.SchemaEditor);

  // if the current user schema is an empty object or null, set the imported schema as the current user schema
  if (
    currentUserSchema.data.value === null ||
    Object.keys(currentUserSchema.data.value).length === 0
  ) {
    currentUserSchema.setData(importedSchema);
    return;
  }

  // otherwise, move everything into the definitions sections
  copyDefinitionsToUserSchema(currentUserSchema, importedSchema, '$defs');
  copyDefinitionsToUserSchema(currentUserSchema, importedSchema, 'definitions');

  const rootElement = importedSchema;
  // delete definitions of root element
  delete rootElement.$defs;
  delete rootElement.definitions;
  // copy all properties of root element to a sub element in the schema
  const newRootElementId = findAvailableSchemaId(
    currentUserSchema,
    ['$defs'],
    'importedSchema',
    true
  );
  currentUserSchema.setDataAt(newRootElementId, rootElement);
}

function copyDefinitionsToUserSchema(
  userSchema: ManagedData,
  importedSchema: any,
  type: '$defs' | 'definitions'
) {
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
