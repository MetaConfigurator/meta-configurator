import {JsonSchema} from '@/helpers/schema/JsonSchema';

export function placeHolderValue() {
  const props = defineProps<{
    propertySchema: JsonSchema;
  }>();

  return props.propertySchema.examples && props.propertySchema.examples.length > 0
    ? `Possible Examples: ${props.propertySchema.examples}`
    : '';
}
