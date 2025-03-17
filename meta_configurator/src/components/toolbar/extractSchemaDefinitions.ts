import {openClearDataEditorDialog} from '@/components/toolbar/clearFile';
import {toastService} from '@/utility/toastService';
import {useDataSource} from '@/data/dataSource';
import {fetchExternalContent} from '@/utility/fetchExternalContent';

/**
 * Goes through the schema and extracts all sub-schema definitions into the $defs section.
 */
export async function fetchSchemaFromUrl(schemaURL: string): Promise<void> {
  const response = await fetchExternalContent(schemaURL);
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
