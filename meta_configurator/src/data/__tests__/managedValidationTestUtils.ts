import {computed, ref, type Ref} from 'vue';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';

class WorkerTestDouble {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage() {}
  terminate() {}
}

export function installWorkerTestDouble(): void {
  globalThis.Worker = WorkerTestDouble as unknown as typeof Worker;
}

/** Avoids the real validation worker and its circular store imports in focused tree tests. */
export async function createManagedValidationModuleTestDouble() {
  const {ValidationService} = await import('@/schema/validationService');
  const {ValidationResult} = await import('@/schema/validationUtils');

  class ManagedValidationTestDouble {
    currentValidationService = computed(
      () => new ValidationService(this.validationSchemaRaw?.value ?? {})
    );
    currentValidationResult = ref(new ValidationResult([]));

    constructor(public mode: unknown, private readonly validationSchemaRaw?: Ref<JsonSchemaType>) {}

    updateValidationResultAsync() {}
  }

  return {ManagedValidation: ManagedValidationTestDouble};
}
