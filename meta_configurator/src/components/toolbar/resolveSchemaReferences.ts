import {toastService} from '@/utility/toastService';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import $RefParser from "@apidevtools/json-schema-ref-parser";
import {useErrorService} from '@/utility/errorServiceInstance.ts';

/**
 * Goes through the schema and resolves all references.
 * Afterwards removes all definitions from the schema, as they should not be needed anymore.
 */
export async function resolveSchemaReferences(): Promise<void> {
  const managedSchemaData = getDataForMode(SessionMode.SchemaEditor);
  const schemaData = managedSchemaData.data.value;
  try {

    // count definitions for info message
    const definitionCount =
      Object.keys(schemaData.$defs || {}).length +
      Object.keys(schemaData.definitions || {}).length;

    let resolvedSchema = await $RefParser.dereference(schemaData,  { mutateInputSchema: false });

    // remove definitions, as they should not be needed anymore
    delete resolvedSchema.$defs;
    delete resolvedSchema.definitions;

    // serialize and deserialize the schema, in case of circular reference, this will fail. Good to catch early
    resolvedSchema = JSON.parse(JSON.stringify(resolvedSchema));

    // set the resolved schema as the new schema
    managedSchemaData.setData(resolvedSchema);

    if (toastService) {
      toastService.add({
        severity: 'info',
        summary: 'Info',
        detail: `"All references in the schema were resolved and ${definitionCount} definitions were removed.`,
        life: 5000,
      });
    }

  } catch (error) {
    useErrorService().onError(error);
  }

}
