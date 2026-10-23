import {shallowRef} from 'vue';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {extractAllInlinedSchemaElements} from '@/schema/schemaManipulationUtils';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import type {ExtractSubSchemasIntoReferencesOptions} from '@/schema/refinement/refineSchemaTypes';

export function extractSubSchemasIntoReferences(
  schema: TopLevelSchema,
  options: ExtractSubSchemasIntoReferencesOptions
): TopLevelSchema {
  const schemaRef = shallowRef(schema);
  const schemaData = new ManagedData(schemaRef, SessionMode.SchemaEditor);

  extractAllInlinedSchemaElements(schemaData, options.extractRootElement, options.extractEnums);

  return schemaRef.value as TopLevelSchema;
}
