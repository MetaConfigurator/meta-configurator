import {computed, ref} from 'vue';
import {readFileContent} from '@/utility/readFileContent';
import {detectFormatAndParseInBackend} from './dataImportAiService';

/** Owns the selected file and its asynchronous backend format-detection lifecycle. */
export function useDataImportAiSourceFile() {
  const selectedFileName = ref('');
  const selectedFileSize = ref(0);
  const selectedFileType = ref('');
  const uploadedContent = ref('');
  const backendDisplayText = ref('');
  const backendPromptHint = ref('');
  const backendRecognized = ref(false);
  const isFormatProcessingUnavailable = ref(false);
  const parsedJsonFromBackend = ref<unknown | null>(null);
  const preprocessedJsonForAi = ref<unknown | null>(null);
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

      isFormatProcessingUnavailable.value = detectionResult === null;
      if (detectionResult === null) {
        backendDisplayText.value =
          'Backend format detection unavailable. Falling back to AI mapping.';
        return;
      }

      backendRecognized.value = detectionResult.recognized;
      backendDisplayText.value = detectionResult.display_text ?? detectionResult.message;
      backendPromptHint.value = detectionResult.ai_prompt_hint ?? '';
      parsedJsonFromBackend.value = detectionResult.recognized
        ? detectionResult.parsed_json ?? null
        : null;
      preprocessedJsonForAi.value = detectionResult.recognized
        ? detectionResult.preprocessed_for_ai ?? null
        : null;
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
    isFormatProcessingUnavailable.value = false;
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
    isFormatProcessingUnavailable,
    parsedJsonFromBackend,
    preprocessedJsonForAi,
    isDetectingFormat,
    canUseDirectParse,
    selectSourceFile,
    resetSourceFile,
  };
}
