import {toastService} from '@/utility/toastService';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import {useErrorService} from '@/utility/errorServiceInstance.ts';
import {detectSchemaFeatures} from '@/schema/detectSchemaFeatures.ts';
import type {TopLevelSchema} from '@/schema/jsonSchemaType.ts';

/**
 * Goes through the schema and moves all external references to the same document, so that the schema is self-contained and can be used without worrying about missing references.
 */
export async function bundleSchema(): Promise<void> {
  const managedSchemaData = getDataForMode(SessionMode.SchemaEditor);
  const schemaData = managedSchemaData.data.value;
  try {
    let bundledSchema = await $RefParser.bundle(schemaData, {mutateInputSchema: false});
    managedSchemaData.setData(bundledSchema);

    if (toastService) {
      let message = `All external references in the schema were bundled into the same document.`;
      const newSchemaFeatures = detectSchemaFeatures(bundledSchema as TopLevelSchema);
      if (newSchemaFeatures.externalReferences) {
        message += ` However, the bundled schema still contains external references, so you might want to repeat the process until there are no external references left.`;
      }

      toastService.add({
        severity: 'info',
        summary: 'Info',
        detail: message,
        life: 5000,
      });
    }
  } catch (error) {
    useErrorService().onError(error);
  }
}
