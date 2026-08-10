import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {runSchemaRefinement} from '@/schema/refinement/runSchemaRefinement';
import type {RefineSchemaSelection} from '@/schema/refinement/refineSchemaTypes';
import {ValidationService} from '@/schema/validationService';
import {toastService} from '@/utility/toastService';

function buildRefinedSchemaCandidate(selection: RefineSchemaSelection): TopLevelSchema {
  const currentSchema = getDataForMode(SessionMode.SchemaEditor).data.value as TopLevelSchema;
  const currentData = getDataForMode(SessionMode.DataEditor).data.value;

  return runSchemaRefinement(currentSchema, currentData, selection);
}

function formatValidationErrors(errors: {instancePath?: string; message?: string}[]): string {
  return errors
    .slice(0, 3)
    .map(error => {
      const location =
        error.instancePath && error.instancePath.length > 0 ? error.instancePath : '/';
      const message = error.message ?? 'Unknown validation error';
      return `${location}: ${message}`;
    })
    .join(' | ');
}

function tryCommitRefinedSchema(candidateSchema: TopLevelSchema): boolean {
  const currentData = getDataForMode(SessionMode.DataEditor).data.value;
  const schemaEditorData = getDataForMode(SessionMode.SchemaEditor);

  try {
    const validationResult = new ValidationService(candidateSchema).validate(currentData);
    if (!validationResult.valid) {
      toastService.add({
        severity: 'error',
        summary: 'Schema not applied',
        detail: `The refined schema does not match the current data. ${formatValidationErrors(
          validationResult.errors
        )}`,
        life: 7000,
      });
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastService.add({
      severity: 'error',
      summary: 'Schema not applied',
      detail: `The refined schema could not be validated: ${message}`,
      life: 7000,
    });
    return false;
  }

  schemaEditorData.setData(candidateSchema);
  toastService.add({
    severity: 'success',
    summary: 'Schema applied',
    detail: 'The refined schema was applied and still matches the current data.',
    life: 5000,
  });
  return true;
}

export function applySchemaRefinements(selection: RefineSchemaSelection): boolean {
  const refinedSchemaCandidate = buildRefinedSchemaCandidate(selection);
  return tryCommitRefinedSchema(refinedSchemaCandidate);
}
