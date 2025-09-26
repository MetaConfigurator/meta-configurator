import {computed, ref, type Ref, watch} from 'vue';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {ValidationService} from '@/schema/validationService';
import {ValidationResult} from '@/schema/validationUtils';
import {useSettings} from '@/settings/useSettings';
import {sizeOf} from '@/utility/sizeOf';

// Import worker as ESM
import ValidationWorker from '@/workers/validationWorker?worker';

export class ManagedValidation {
  private worker: Worker;
  private pendingTasks: Map<string, (result: ValidationResult) => void> = new Map();

  constructor(public mode: SessionMode) {
    this.worker = new ValidationWorker();

    this.worker.onmessage = (e: MessageEvent) => {
      const {type, result, error, taskId} = e.data;
      const resolver = this.pendingTasks.get(taskId);
      if (!resolver) return;

      if (type === 'VALIDATION_COMPLETE') {
        resolver(new ValidationResult(result.errors || []));
      } else if (type === 'VALIDATION_ERROR') {
        console.error('Validation worker error:', error);
        resolver(new ValidationResult([]));
      }

      this.pendingTasks.delete(taskId);
    };

    watch(getDataForMode(this.mode).shallowDataRef, () => {
      this.updateValidationResultAsync();
    });

    watch(getSchemaForMode(this.mode).schemaRaw, () => {
      this.updateValidationResultAsync();
    });
  }

  // this service is used by other components, to validate for example conditionals
  public currentValidationService = computed(() => {
    const schema = getSchemaForMode(this.mode).schemaRaw.value;
    return new ValidationService(schema ?? {});
  });

  public currentValidationResult: Ref<ValidationResult> = ref<ValidationResult>(
    new ValidationResult([])
  );
  private requestedValidationUpdate = false;
  private isValidationOngoing = false;

  private async validateWithWorker(data: any, schema: any): Promise<ValidationResult> {
    const taskId = crypto.randomUUID(); // unique ID per validation
    return new Promise(resolve => {
      this.pendingTasks.set(taskId, resolve);
      this.worker.postMessage({type: 'VALIDATE', data, schema, taskId});
    });
  }

  public async updateValidationResultAsync() {
    setTimeout(async () => {
      if (this.isValidationOngoing) {
        this.requestedValidationUpdate = true;
        return;
      }

      this.isValidationOngoing = true;

      const data = getDataForMode(this.mode).data.value;
      const schema = getSchemaForMode(this.mode).schemaRaw.value;

      if (sizeOf(data) > useSettings().value.performance.maxDocumentSizeForValidation) {
        this.currentValidationResult.value = new ValidationResult([]);
        this.isValidationOngoing = false;
        return;
      }

      try {
        this.currentValidationResult.value = await this.validateWithWorker(data, schema);
      } catch (err) {
        console.error('Validation failed:', err);
        this.currentValidationResult.value = new ValidationResult([]);
      }

      this.isValidationOngoing = false;

      if (this.requestedValidationUpdate) {
        this.requestedValidationUpdate = false;
        this.updateValidationResultAsync();
      }
    }, 500);
  }
}
