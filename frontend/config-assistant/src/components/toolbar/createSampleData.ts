import {JSONSchemaFaker} from 'json-schema-faker';
import {confirmationService} from '@/utility/confirmationService';
import {toastService} from '@/utility/toastService';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {useDataStore} from '@/store/dataStore';
import {errorService} from '@/main';
import _ from 'lodash';

export async function generateSampleData(schema: any): Promise<any> {
  JSONSchemaFaker.option('alwaysFakeOptionals', true);
  JSONSchemaFaker.option('minItems', 1);
  JSONSchemaFaker.option('failOnInvalidFormat', false);
  return JSONSchemaFaker.resolve(schema);
}
export function randomDataGeneration(message: string | undefined = undefined): void {
  if (!message || _.isEmpty(useDataStore().fileData)) {
    generateExampleData();
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
      generateExampleData();
    },
  });
}
export function generateExampleData() {
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  generateSampleData(useDataStore().schemaData)
    .then(data => (useDataStore().fileData = data))
    .catch((error: Error) =>
      errorService.onError({
        message: 'Error generating sample data',
        details: error.message,
        stack: error.stack,
      })
    );
}
export function openGenerateDataDialog() {
  randomDataGeneration(
    'This will delete all the existing data. Are you sure you want to continue?'
  );
}
