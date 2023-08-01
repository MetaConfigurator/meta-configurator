import {JsonSchema} from '@/helpers/schema/JsonSchema';
import {computed} from 'vue';

const props = defineProps<{
  propertySchema: JsonSchema;
}>();
export const placeHolderValue = computed(() => {
  return props.propertySchema.examples && props.propertySchema.examples.length > 0
    ? `Possible Examples: ${props.propertySchema.examples}`
    : '';
});
