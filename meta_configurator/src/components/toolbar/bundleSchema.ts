import {toastService} from '@/utility/toastService';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import $RefParser from "@apidevtools/json-schema-ref-parser";
import {useErrorService} from '@/utility/errorServiceInstance.ts';

/**
 * Goes through the schema and moves all external references to the same document, so that the schema is self-contained and can be used without worrying about missing references.
 */
export async function bundleSchema(): Promise<void> {
  const managedSchemaData = getDataForMode(SessionMode.SchemaEditor);
  const schemaData = managedSchemaData.data.value;
  try {
    let bundledSchema = await $RefParser.bundle(schemaData,  { mutateInputSchema: false });
    managedSchemaData.setData(bundledSchema);

    if (toastService) {
      toastService.add({
        severity: 'info',
        summary: 'Info',
        detail: `"All external references in the schema were bundled into the same document.`,
        life: 5000,
      });
    }

  } catch (error) {
    useErrorService().onError(error);
  }

}
