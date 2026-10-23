import type {JsonSchemaType} from '../../meta_configurator/src/schema/jsonSchemaType';

export const compositionKinds = ['oneOf', 'anyOf'] as const;
export type CompositionKind = (typeof compositionKinds)[number];

export function selectionField(name: string): JsonSchemaType {
  return {
    title: name,
    type: 'object',
    properties: {[name]: {type: 'string'}},
    additionalProperties: false,
  };
}

export function selectionSchema(
  kind: CompositionKind,
  options: JsonSchemaType[] = ['a', 'b', 'c'].map(selectionField)
): JsonSchemaType {
  return {[kind]: options};
}

export function nestedSelectionSchema(
  outer: CompositionKind,
  inner: CompositionKind
): JsonSchemaType {
  return {
    type: 'object',
    properties: {
      model: selectionSchema(outer, [
        {title: 'Models', ...(selectionSchema(inner) as object)},
        {title: 'Disabled', type: 'null'},
      ]),
    },
  };
}
