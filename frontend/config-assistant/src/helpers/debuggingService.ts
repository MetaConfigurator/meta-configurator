import type {JsonSchemaType} from '@/model/JsonSchemaType';
import type {Ref} from 'vue';
import {ref} from 'vue';

export class DebuggingService {
  public preprocessingSteps: Ref<PreprocessingStep[]> = ref([]);

  public addPreprocessingStep(
    depth: number,
    name: string,
    schema?: JsonSchemaType,
    additionalInfo: string = ''
  ) {
    this.preprocessingSteps.value.push(new PreprocessingStep(depth, name, schema, additionalInfo));
  }

  public resetPreprocessingSteps() {
    console.log('resetPreprocessingSteps');
    this.preprocessingSteps.value = [];
    console.log(this.preprocessingSteps.value);
  }
}

export class PreprocessingStep {
  constructor(
    public depth: number,
    public name: string,
    public schema?: JsonSchemaType,
    public additionalInfo: string = ''
  ) {}

  public get stringRepresentation(): string {
    return `${'  '.repeat(this.depth)} ${this.name} ${this.additionalInfo}`;
  }
}

export const debuggingService = new DebuggingService();
