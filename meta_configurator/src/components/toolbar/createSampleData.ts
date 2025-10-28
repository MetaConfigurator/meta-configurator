import {confirmationService} from '@/utility/confirmationService';
import {toastService} from '@/utility/toastService';
import _ from 'lodash';
import {useCurrentData} from '@/data/useDataLink';
import {useDataSource} from '@/data/dataSource';
import {useErrorService} from '@/utility/errorServiceInstance';

/**
 * Generates sample data for the given schema.
 */
async function generateSampleData(schema: any): Promise<any> {
  try {
    // Use dynamic import for better bundling compatibility
    const {JSONSchemaFaker} = await import('json-schema-faker');

    JSONSchemaFaker.option('alwaysFakeOptionals', true);
    JSONSchemaFaker.option('minItems', 1);
    JSONSchemaFaker.option('failOnInvalidFormat', false);

    return await JSONSchemaFaker.resolve(schema);
  } catch (error) {
    console.error('Error loading json-schema-faker:', error);
    throw new Error('Failed to load schema faker dependencies');
  }
}

function generateSampleDataAndUseAsFileData() {
  generateSampleData(useDataSource().userSchemaData.value)
    .then(data => (useDataSource().userData.value = data))
    .catch((error: Error) =>
      useErrorService().onError({
        message: 'Error generating sample data',
        details: error.message,
        stack: error.stack,
      })
    );
}

/**
 * Presents a confirmation dialog to the user and generates sample data if the user confirms.
 * @param message The message to show in the confirmation dialog. If undefined, the schema is cleared without
 *   confirmation.
 */
function triggerDataGeneration(message: string | undefined = undefined): void {
  if (!message || _.isEmpty(useCurrentData().data.value)) {
    generateSampleDataAndUseAsFileData();
    return;
  }
  confirmationService.require({
    message: message,
    header: 'Delete Confirmation',
    icon: 'pi pi-info-circle',
    acceptClass: 'p-button-danger',
    accept: () => {
      toastService.add({
        severity: 'info',
        summary: 'Confirmed',
        detail: 'Successfully generated example data.',
        life: 3000,
      });
      generateSampleDataAndUseAsFileData();
    },
  });
}

/**
 * Opens a confirmation dialog to the user and generates sample data if the user confirms.
 */
export function openGenerateDataDialog() {
  triggerDataGeneration(
    'This will delete all the existing data. Are you sure you want to continue?'
  );
}
