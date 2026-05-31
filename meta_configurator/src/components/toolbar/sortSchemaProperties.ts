import {toastService} from '@/utility/toastService';
import {sortSchemaPropertiesAlphabetically} from '@/components/panels/gui-editor/sortingUtils';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';

/**
 * Reorders every property map (`properties`, `patternProperties`, `dependentSchemas`,
 * `$defs`, `definitions`) and the `required` array in the schema alphabetically.
 */
export async function sortSchemaPropertiesAlphabeticallyAction(): Promise<void> {
  const schemaData = getDataForMode(SessionMode.SchemaEditor);
  schemaData.setData(sortSchemaPropertiesAlphabetically(schemaData.data.value));

  if (toastService) {
    toastService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Sorted all schema properties alphabetically.',
      life: 5000,
    });
  }
}
