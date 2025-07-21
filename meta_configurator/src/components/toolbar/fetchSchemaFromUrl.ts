import {openClearDataEditorDialog} from '@/components/toolbar/clearFile';
import {toastService} from '@/utility/toastService';
import {useDataSource} from '@/data/dataSource';
import {fetchExternalContent} from '@/utility/fetchExternalContent';
import {adaptComplexitySettingsToLoadedSchema} from '@/settings/settingsUpdater';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';

/**
 * Fetches the schema from the given URL and sets it as the current schema.
 */
export async function fetchSchemaFromUrl(schemaURL: string): Promise<void> {
  const response = await fetchExternalContent(schemaURL);
  const schemaContent = await response.json();
  const schemaName = schemaContent.title || 'Unknown Schema';
  useDataSource().userSchemaData.value = schemaContent;
  useDataSource().newSchemaWasFetched.value = true;
  // this will adapt the meta schema settings to enable/disable multiple types, boolean schema support, etc.
  const userSettings = getDataForMode(SessionMode.Settings).data.value;
  adaptComplexitySettingsToLoadedSchema(userSettings, schemaContent);

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
