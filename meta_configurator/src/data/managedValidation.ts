import {computed} from 'vue';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {ValidationResult, ValidationService} from '@/schema/validationService';
import {useSettings} from '@/settings/useSettings';
import {sizeOf} from '@/utility/sizeOf';

export class ManagedValidation {
  constructor(public mode: SessionMode) {}

  public currentValidationService = computed(() => {
    const schema = getSchemaForMode(this.mode).schemaRaw.value;
    return new ValidationService(schema ?? {});
  });

  public currentValidationResult = computed(() => {
    const data = getDataForMode(this.mode).data.value;
    if (sizeOf(data) > useSettings().value.performance.maxDocumentSizeForValidation) {
      return new ValidationResult([]);
    }
    return this.currentValidationService.value.validate(getDataForMode(this.mode).data.value);
  });
}
