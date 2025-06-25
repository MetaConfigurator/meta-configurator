import {inferSchema} from '@jsonhero/schema-infer';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';
import {trimDataToMaxSize} from "@/utility/trimData";
import {useSettings} from "@/settings/useSettings";

export function inferJsonSchema(sampleData: any): JsonSchemaType {
  // trim sample data if needed
  const maximumSizeInKiB = useSettings().value.performance.maxDocumentSizeForSchemaInference / 1024; // convert bytes to KiB
  sampleData = trimDataToMaxSize(sampleData, maximumSizeInKiB);
  return inferSchema(sampleData).toJSONSchema();
}
