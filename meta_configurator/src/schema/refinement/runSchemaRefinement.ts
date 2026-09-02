import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {addExamplesToSchemaFromSamples} from '@/schema/refinement/addExamples';
import {detectAdditionalPropertiesInSchemaFromSamples} from '@/schema/refinement/detectAdditionalProperties';
import {detectEnumsInSchemaFromSamples} from '@/schema/refinement/detectEnums';
import {extractSubSchemasIntoReferences} from '@/schema/refinement/extractSubSchemasIntoReferences';
import type {RefineSchemaSelection} from '@/schema/refinement/refineSchemaTypes';
import {sortSchemaPropertiesAlphabetically} from '@/schema/sortSchemaPropertiesAlphabetically';
import {cloneDeep} from 'lodash';

export function runSchemaRefinement(
  schema: TopLevelSchema,
  data: unknown,
  selection: RefineSchemaSelection
): TopLevelSchema {
  const samples = [data];
  let refinedSchema = cloneDeep(schema);

  if (selection.detectAdditionalProperties) {
    detectAdditionalPropertiesInSchemaFromSamples(
      refinedSchema,
      samples,
      selection.detectAdditionalProperties
    );
  }
  if (selection.addExamples) {
    addExamplesToSchemaFromSamples(refinedSchema, samples, selection.addExamples);
  }
  if (selection.detectEnums) {
    detectEnumsInSchemaFromSamples(refinedSchema, samples, selection.detectEnums);
  }
  if (selection.extractSubSchemasIntoReferences) {
    refinedSchema = extractSubSchemasIntoReferences(
      refinedSchema,
      selection.extractSubSchemasIntoReferences
    );
  }
  if (selection.sortSchemaPropertiesAlphabetically) {
    refinedSchema = sortSchemaPropertiesAlphabetically(refinedSchema);
  }

  return refinedSchema;
}
