import {computed} from 'vue';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {ValidationService} from '@/schema/validationService';

export class ManagedValidation {
  constructor(public mode: SessionMode) {}

  public currentValidationService = computed(() => {
    const schema = getSchemaForMode(this.mode).schemaRaw.value;
    return new ValidationService(schema ?? {});
  });

  public currentValidationResult = computed(() => {
    return this.currentValidationService.value.validate(getDataForMode(this.mode).data.value);
  });
}
