import type {TopLevelSchema} from '@/model/JsonSchemaType';

export interface SchemaOption {
  label: string;
  icon?: string;
  url?: string | undefined;
  key?: string | undefined;
  schema?: TopLevelSchema;
}
