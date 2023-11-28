import type {ValidationResult} from '@/schema/validation/validationService';
import {ValidationService} from '@/schema/validation/validationService';
import {computed} from 'vue';
import {useCurrentDataLink} from '@/data/useDataLink';

const currentValidationService = computed(() => {
  const schema = useCurrentDataLink().schema.value;
  return new ValidationService(schema ?? {});
});

export function useValidationService() {
  return currentValidationService.value;
}

const currentValidationResult = computed(() => {
  return useValidationService().validate(useCurrentDataLink().data.value);
});

export function useValidationResult(): ValidationResult {
  return currentValidationResult.value;
}
