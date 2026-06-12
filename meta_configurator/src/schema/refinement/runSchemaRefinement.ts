import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {addExamplesToSchema} from '@/schema/refinement/addExamples';
import {detectAdditionalPropertiesInSchema} from '@/schema/refinement/detectAdditionalProperties';
import {detectEnumsInSchema} from '@/schema/refinement/detectEnums';
import {detectPatternPropertiesInSchema} from '@/schema/refinement/detectPatternProperties';
import type {RefineSchemaSelection} from '@/schema/refinement/refineSchemaTypes';
import _ from 'lodash';

export function runSchemaRefinement(
  schema: TopLevelSchema,
  data: unknown,
  selection: RefineSchemaSelection
): TopLevelSchema {
  const refinedSchema = _.cloneDeep(schema);

  if (selection.detectPatternProperties) {
    detectPatternPropertiesInSchema(refinedSchema, data, selection.detectPatternProperties);
  }
  if (selection.detectAdditionalProperties) {
    detectAdditionalPropertiesInSchema(refinedSchema, data, selection.detectAdditionalProperties);
  }
  if (selection.addExamples) {
    addExamplesToSchema(refinedSchema, data, selection.addExamples);
  }
  if (selection.detectEnums) {
    detectEnumsInSchema(refinedSchema, data, selection.detectEnums);
  }

  return refinedSchema;
}
