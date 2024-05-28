import {openClearDataEditorDialog} from '@/components/toolbar/clearFile';
import {toastService} from '@/utility/toastService';
import {useDataSource} from '@/data/dataSource';

/**
 * Fetches the schema from the given URL and sets it as the current schema.
 */
export async function fetchSchemaFromUrl(schemaURL: string): Promise<void> {
  const response = await fetch(schemaURL);
  const schemaContent = await response.json();
  const schemaName = schemaContent.title || 'Unknown Schema';
  useDataSource().userSchemaData.value = schemaContent;

  openClearDataEditorDialog();

  if (toastService) {
    toastService.add({
      severity: 'info',
      summary: 'Info',
      detail: `"${schemaName}" fetched successfully`,
      life: 3000,
    });
  }
}
