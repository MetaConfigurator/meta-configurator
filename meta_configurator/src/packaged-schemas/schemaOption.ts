import type {TopLevelSchema} from '@/schema/jsonSchemaType';

export interface SchemaOption {
  label: string;
  icon?: string;
  url?: string | undefined;
  key?: string | undefined;
  schema?: TopLevelSchema;
}
