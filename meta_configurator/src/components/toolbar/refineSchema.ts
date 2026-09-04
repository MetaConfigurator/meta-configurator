import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {runSchemaRefinement} from '@/schema/refinement/runSchemaRefinement';
import type {RefineSchemaSelection} from '@/schema/refinement/refineSchemaTypes';
import {ValidationService} from '@/schema/validationService';
import {toastService} from '@/utility/toastService';
import {getErrorMessage} from '@/utility/getErrorMessage';
import type {ErrorObject} from 'ajv';

/**
 * Refines the current schema and applies it, but only if the refinement does not
 * introduce validation errors in the current data. Returns whether it was applied.
 */
export function applySchemaRefinements(selection: RefineSchemaSelection): boolean {
  const schemaEditorData = getDataForMode(SessionMode.SchemaEditor);
  const currentData = getDataForMode(SessionMode.DataEditor).data.value;
  const refinedSchema = runSchemaRefinement(
    schemaEditorData.data.value as TopLevelSchema,
    currentData,
    selection
  );

  const rejectionReason = getSchemaRefinementRejectionReason(
    schemaEditorData.data.value as TopLevelSchema,
    refinedSchema,
    currentData
  );
  if (rejectionReason) {
    toastService.add({
      severity: 'error',
      summary: 'Schema not applied',
      detail: rejectionReason,
      life: 7000,
    });
    return false;
  }

  schemaEditorData.setData(refinedSchema);
  toastService.add({
    severity: 'success',
    summary: 'Schema applied',
    detail: 'The refined schema was applied without introducing new validation errors.',
    life: 5000,
  });
  return true;
}

/** Returns why the refined schema must not be applied, or null when it adds no data errors. */
export function getSchemaRefinementRejectionReason(
  originalSchema: TopLevelSchema,
  candidateSchema: TopLevelSchema,
  currentData: unknown
): string | null {
  let originalErrors: ErrorObject[];
  try {
    originalErrors = new ValidationService(originalSchema).validate(currentData).errors;
  } catch (error) {
    return `The current schema could not be validated before refinement: ${getErrorMessage(error)}`;
  }

  let candidateErrors: ErrorObject[];
  try {
    candidateErrors = new ValidationService(candidateSchema).validate(currentData).errors;
  } catch (error) {
    return `The refined schema could not be validated: ${getErrorMessage(error)}`;
  }

  const originalErrorKeys = new Set(originalErrors.map(validationErrorKey));
  const introducedErrors = candidateErrors.filter(
    error => !originalErrorKeys.has(validationErrorKey(error))
  );
  if (introducedErrors.length === 0) {
    return null;
  }
  return `The refined schema introduces validation errors. ${formatValidationErrors(
    introducedErrors
  )}`;
}

/** Schema paths may move during refinement, so compare the actual instance constraint failure. */
function validationErrorKey(error: ErrorObject): string {
  return JSON.stringify({
    instancePath: error.instancePath,
    keyword: error.keyword,
    params: error.params,
    message: error.message,
  });
}

function formatValidationErrors(errors: {instancePath?: string; message?: string}[]): string {
  return errors
    .slice(0, 3)
    .map(error => {
      const location = error.instancePath?.length ? error.instancePath : '/';
      return `${location}: ${error.message ?? 'Unknown validation error'}`;
    })
    .join(' | ');
}
