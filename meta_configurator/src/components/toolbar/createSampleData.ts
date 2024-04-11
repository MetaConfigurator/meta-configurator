import {JSONSchemaFaker} from 'json-schema-faker';
import {confirmationService} from '@/utility/confirmationService';
import {toastService} from '@/utility/toastService';
import {errorService} from '@/main';
import _ from 'lodash';
import {useCurrentData} from '@/data/useDataLink';
import {useDataSource} from '@/data/dataSource';

/**
 * Generates sample data for the given schema.
 */
async function generateSampleData(schema: any): Promise<any> {
  JSONSchemaFaker.option('alwaysFakeOptionals', true);
  JSONSchemaFaker.option('minItems', 1);
  JSONSchemaFaker.option('failOnInvalidFormat', false);
  return JSONSchemaFaker.resolve(schema);
}

function generateSampleDataAndUseAsFileData() {
  generateSampleData(useDataSource().userSchemaData.value)
    .then(data => (useDataSource().userSchemaData.value = data))
    .catch((error: Error) =>
      errorService.onError({
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
