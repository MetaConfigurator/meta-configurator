// schemaActions.ts

import {useDataStore} from '@/store/dataStore';

export function handleChooseSchema(selectedSchema: any) {
  useDataStore().schemaData = selectedSchema.schema;
  console.log('schemaData:', useDataStore().schemaData);
}
