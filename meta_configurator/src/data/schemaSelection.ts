import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {safeMergeSchemas} from '@/schema/mergeAllOfs';
import {typeSchema} from '@/schema/schemaProcessingUtils';
import type {ManagedUserSchemaSelection} from '@/data/managedUserSchemaSelection';

export type SchemaSelectionKind = 'oneOf' | 'anyOf' | 'type';

/** The same priority must be used by the displayed control and schema resolution. */
export function schemaSelectionKind(schema: JsonSchemaWrapper): SchemaSelectionKind | undefined {
  if (schema.oneOf.length) return 'oneOf';
  if (schema.anyOf.length) return 'anyOf';
  if (schema.enum === undefined && schema.type.length > 1) return 'type';
  return undefined;
}

function selectedIndices(
  kind: SchemaSelectionKind,
  key: string,
  selections: ManagedUserSchemaSelection
): number[] | undefined {
  if (kind === 'anyOf') {
    const options = selections.getSelectedAnyOfOptions(key);
    return options?.length
      ? [...new Set(options.map(option => option.index))].sort((a, b) => a - b)
      : undefined;
  }
  const option =
    kind === 'oneOf'
      ? selections.getSelectedOneOfOption(key)
      : selections.getSelectedTypeUnionOption(key);
  return option === undefined ? undefined : [option.index];
}

export function hasSchemaSelection(
  schema: JsonSchemaWrapper,
  key: string,
  selections: ManagedUserSchemaSelection
): boolean {
  const kind = schemaSelectionKind(schema);
  return kind !== undefined && selectedIndices(kind, key, selections) !== undefined;
}

/** Resolve exactly one composition step, leaving any nested selector for the next step. */
export function resolveSchemaSelection(
  schema: JsonSchemaWrapper,
  key: string,
  selections: ManagedUserSchemaSelection
): {schema: JsonSchemaWrapper; schemaSelectionKey: string} | undefined {
  const kind = schemaSelectionKind(schema);
  if (!kind) return undefined;
  const indices = selectedIndices(kind, key, selections);
  if (!indices) return undefined;
  const options =
    kind === 'type' ? schema.type.map(type => typeSchema(type, schema.mode)) : schema[kind];
  if (indices.some(index => !Number.isInteger(index) || !options[index])) return undefined;
  const base = {...schema.jsonSchema};
  delete base[kind];
  const merged = safeMergeSchemas(base, ...indices.map(index => options[index]!.jsonSchema ?? {}));
  if (merged === false) return undefined;
  return {
    schema: new JsonSchemaWrapper(merged, schema.mode),
    schemaSelectionKey: JSON.stringify([...JSON.parse(key), [kind, indices]]),
  };
}
