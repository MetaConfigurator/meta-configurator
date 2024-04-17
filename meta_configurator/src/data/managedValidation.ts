import {computed} from 'vue';
import {getSchemaForMode, useCurrentData} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {ValidationService} from '@/schema/validationService';

export class ManagedValidation {
  constructor(public mode: SessionMode) {}

  public currentValidationService = computed(() => {
    const schema = getSchemaForMode(this.mode).schemaRaw.value;
    return new ValidationService(schema ?? {});
  });

  public currentValidationResult = computed(() => {
    return this.currentValidationService.value.validate(useCurrentData().data.value);
  });
}
