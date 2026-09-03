import {computed, ref, shallowRef} from 'vue';
import {readFileContent} from '@/utility/readFileContent';
import {detectFormatAndParseInBackend} from './dataImportAiService';
import {getErrorMessage} from '@/utility/getErrorMessage';

/** Owns the selected file and its asynchronous backend format-detection lifecycle. */
export function useDataImportAiSourceFile() {
  const selectedFileName = ref('');
  const selectedFileSize = ref(0);
  const selectedFileType = ref('');
  const uploadedContent = ref('');
  const backendDisplayText = ref('');
  const backendPromptHint = ref('');
  const backendRecognized = ref(false);
  const formatProcessingErrorMessage = ref('');
  // shallowRef: a deep ref would hand out a reactive proxy of the parsed document, and such
  // a proxy cannot be structured-cloned into the sandbox or validation worker.
  const parsedJsonFromBackend = shallowRef<unknown | null>(null);
  const preprocessedJsonForAi = shallowRef<unknown | null>(null);
  const isDetectingFormat = ref(false);
  let selectedFileSequence = 0;

  const canUseDirectParse = computed(
    () => backendRecognized.value && parsedJsonFromBackend.value !== null
  );

  async function selectSourceFile(event: Event): Promise<boolean> {
    resetSourceFile();
    const selectedFile = (event.target as HTMLInputElement).files?.[0];
    if (!selectedFile) {
      return false;
    }

    const fileSequence = selectedFileSequence;
    selectedFileName.value = selectedFile.name;
    selectedFileSize.value = selectedFile.size;
    selectedFileType.value = selectedFile.type;

    try {
      const fileContent = await readFileContent(selectedFile);
      if (fileSequence !== selectedFileSequence) {
        return false;
      }

      uploadedContent.value = fileContent;
      if (fileContent.length > 0) {
        await detectSelectedFileFormat(fileSequence);
      }
      return fileSequence === selectedFileSequence;
    } catch (error) {
      if (fileSequence !== selectedFileSequence) {
        return false;
      }
      resetSourceFile();
      throw error;
    }
  }

  function resetSourceFile() {
    selectedFileSequence += 1;
    selectedFileName.value = '';
    selectedFileSize.value = 0;
    selectedFileType.value = '';
    uploadedContent.value = '';
    resetFormatDetection();
  }

  async function detectSelectedFileFormat(fileSequence: number) {
    isDetectingFormat.value = true;
    try {
      const detectionResult = await detectFormatAndParseInBackend(
        selectedFileName.value,
        selectedFileType.value,
        uploadedContent.value
      );
      if (fileSequence !== selectedFileSequence) {
        return;
      }

      backendRecognized.value = detectionResult.recognized;
      backendDisplayText.value = detectionResult.message;
      backendPromptHint.value = detectionResult.ai_prompt_hint ?? '';
      parsedJsonFromBackend.value = detectionResult.recognized
        ? detectionResult.parsed_json ?? null
        : null;
      preprocessedJsonForAi.value = detectionResult.recognized
        ? detectionResult.preprocessed_for_ai ?? null
        : null;
    } catch (error) {
      // The service reports why it failed, so the user sees that reason instead of a
      // generic "backend unavailable" for rate limits, oversized files or parse errors.
      if (fileSequence === selectedFileSequence) {
        formatProcessingErrorMessage.value = getErrorMessage(error);
      }
    } finally {
      if (fileSequence === selectedFileSequence) {
        isDetectingFormat.value = false;
      }
    }
  }

  function resetFormatDetection() {
    isDetectingFormat.value = false;
    backendDisplayText.value = '';
    backendPromptHint.value = '';
    backendRecognized.value = false;
    formatProcessingErrorMessage.value = '';
    parsedJsonFromBackend.value = null;
    preprocessedJsonForAi.value = null;
  }

  return {
    selectedFileName,
    selectedFileSize,
    selectedFileType,
    uploadedContent,
    backendDisplayText,
    backendPromptHint,
    formatProcessingErrorMessage,
    parsedJsonFromBackend,
    preprocessedJsonForAi,
    isDetectingFormat,
    canUseDirectParse,
    selectSourceFile,
    resetSourceFile,
  };
}
