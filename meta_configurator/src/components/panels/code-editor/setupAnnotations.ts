import {type Annotation, Editor} from 'brace';
import type {ErrorObject} from 'ajv';
import {jsonPointerToPath, pathToJsonPointer} from '@/utility/pathUtils';
import {determineCursorPosition} from '@/components/panels/code-editor/aceUtility';
import {computed} from 'vue';
import {useDataConverter, usePathIndexLink} from '@/dataformats/formatRegistry';
import {watchDebounced} from '@vueuse/core';
import type {SessionMode} from '@/store/sessionMode';
import {getValidationForMode} from '@/data/useDataLink';
import {useSettings} from '@/settings/useSettings';

/**
 * Sets up the editor to show validation errors.
 * @param editor the ace editor
 * @param mode
 */
export function setupAnnotationsFromValidationErrors(editor: Editor, mode: SessionMode) {
  const validationAnnotations = computed(() => {
    // do not attempt to display schema validation errors when the text does not have valid syntax
    // (would otherwise result in errors when trying to parse CST)
    if (!useDataConverter().isValidSyntax(editor.getValue())) {
      return [];
    }

    let {errors} = getValidationForMode(mode).currentValidationResult.value;

    const supportsBulkPathDetermination = usePathIndexLink().determineIndexesOfPaths !== undefined;

    const maxErrorsToShow = supportsBulkPathDetermination
      ? useSettings().value.performance.maxErrorsToShowBulkValidation
      : useSettings().value.performance.maxErrorsToShow;
    if (errors.length > maxErrorsToShow) {
      errors = errors.slice(0, maxErrorsToShow);
    }

    if (supportsBulkPathDetermination) {
      return validationErrorsToAnnotations(editor, errors);
    } else {
      return errors.map(error => validationErrorToAnnotation(editor, error));
    }
  });

  watchDebounced(
    validationAnnotations,
    (annotations: Annotation[]) => editor.getSession().setAnnotations(annotations),
    {debounce: 500} // delay needed otherwise no annotations are shown
  );
}

function validationErrorToAnnotation(editor: Editor, error: ErrorObject): Annotation {
  const instancePathTranslated = jsonPointerToPath(error.instancePath);
  const position = determineCursorPosition(editor, editor.getValue(), instancePathTranslated);
  return {
    row: position.row,
    column: position.column,
    text: error.message ?? 'Validation error',
    type: 'error',
  };
}

// optimized version that uses bulk path index determination
function validationErrorsToAnnotations(editor: Editor, errors: ErrorObject[]): Annotation[] {
  const result: Annotation[] = [];
  const positions = usePathIndexLink().determineIndexesOfPaths!(
    editor.getValue(),
    errors.map(error => jsonPointerToPath(error.instancePath))
  );

  const cachedPositionsForIndices: {[index: number]: {row: number; column: number}} = {};

  for (const error of errors) {
    const instancePathTranslated = jsonPointerToPath(error.instancePath);
    // note that we use our own pathToJsonPointer here, to ensure consistent serialization
    const instancePathKey = pathToJsonPointer(instancePathTranslated);
    if (!(instancePathKey in positions)) {
      continue;
    }

    const index = positions[instancePathKey];
    let position;
    if (index in cachedPositionsForIndices) {
      position = cachedPositionsForIndices[index];
    } else {
      position = editor.session.doc.indexToPosition(index, 0);
      cachedPositionsForIndices[index] = position;
    }

    const annotation: Annotation = {
      row: position.row,
      column: position.column,
      text: error.message ?? 'Validation error',
      type: 'error',
    };
    result.push(annotation);
  }

  return result;
}
