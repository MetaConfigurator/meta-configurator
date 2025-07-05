import {inferSchema} from '@jsonhero/schema-infer';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';
import {trimDataToMaxSize} from '@/utility/trimData';
import {useSettings} from '@/settings/useSettings';

export function inferJsonSchema(sampleData: any): JsonSchemaType {
  // trim sample data if needed
  const maximumSizeInKiB = useSettings().value.performance.maxDocumentSizeForSchemaInference / 1024; // convert bytes to KiB
  const minObjectPropertyCountToPreserve =
    useSettings().value.performance.minObjectPropertyCountToPreserve;
  sampleData = trimDataToMaxSize(sampleData, maximumSizeInKiB, minObjectPropertyCountToPreserve);
  return inferSchema(sampleData).toJSONSchema();
}
