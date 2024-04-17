import {type Annotation, Editor} from 'brace';
import type {ErrorObject} from 'ajv';
import {jsonPointerToPath} from '@/utility/pathUtils';
import {determineCursorPosition} from '@/components/code-editor/aceUtility';
import {computed} from 'vue';
import {useDataConverter} from '@/dataformats/formatRegistry';
import {watchDebounced} from '@vueuse/core';
import type {SessionMode} from '@/store/sessionMode';
import {getValidationForMode} from '@/data/useDataLink';

/**
 * Sets up the editor to show validation errors.
 * @param editor the ace editor
 */
export function setupAnnotationsFromValidationErrors(editor: Editor, mode: SessionMode) {
  const validationAnnotations = computed(() => {
    // do not attempt to display schema validation errors when the text does not have valid syntax
    // (would otherwise result in errors when trying to parse CST)
    if (!useDataConverter().isValidSyntax(editor.getValue())) {
      return [];
    }

    const {errors} = getValidationForMode(mode).currentValidationResult.value;
    return errors.map(error => validationErrorToAnnotation(editor, error));
  });

  watchDebounced(
    validationAnnotations,
    (annotations: Annotation[]) => editor.getSession().setAnnotations(annotations),
    {debounce: 500} // delay needed otherwise no annotations are shown
  );
}

function validationErrorToAnnotation(editor: Editor, error: ErrorObject): Annotation {
  const instancePathTranslated = jsonPointerToPath(error.instancePath);
  const position = determineCursorPosition(editor, instancePathTranslated);
  return {
    row: position.row,
    column: position.column,
    text: error.message ?? 'Validation error',
    type: 'error',
  };
}
