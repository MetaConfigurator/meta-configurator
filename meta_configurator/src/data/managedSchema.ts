import type {Ref, ShallowRef} from 'vue';
import {ref} from 'vue';
import type {Path} from '@/model/path';
import {pathToString} from '@/utility/pathUtils';
import {watchDebounced} from '@vueuse/core';
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';
import {TopLevelJsonSchema} from '@/schema/topLevelJsonSchema';
import type {JsonSchemaType} from '@/model/jsonSchemaType';
import {JsonSchema} from '@/schema/jsonSchema';
import {calculateEffectiveSchema, EffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import {useCurrentData} from '@/data/useDataLink';
import {useUserSchemaSelectionStore} from '@/store/userSchemaSelectionStore';

/**
 * This class manages the schema and provides easy access to its content.
 */
export class ManagedSchema {
  /**
   * @param _shallowSchemaRef the shallow ref to the schema
   * @param watchSchemaChanges whether to watch for changes in schema data and reprocess the schema accordingly
   */
  constructor(private _shallowSchemaRef: ShallowRef, watchSchemaChanges: boolean) {
    this._schemaDataPreprocessed = ref(preprocessOneTime(this._shallowSchemaRef.value));
    this._schemaProcessed = ref(new TopLevelJsonSchema(this._schemaDataPreprocessed.value));

    if (watchSchemaChanges) {
      // make sure that the schema is not preprocessed too often
      watchDebounced(this.schemaData, () => this.reloadSchema(), {
        debounce: 1000,
        immediate: true,
      });
    }
  }

  private _schemaDataPreprocessed: Ref<JsonSchemaType>;

  /**
   * The json schema as a TopLevelJsonSchema object
   */
  private readonly _schemaProcessed: Ref<TopLevelJsonSchema>;

  get schemaDataPreprocessed(): Ref<JsonSchemaType> {
    return this._schemaDataPreprocessed;
  }

  get schemaProcessed(): Ref<TopLevelJsonSchema> {
    return this._schemaProcessed!;
  }

  get schemaData(): Ref<any> {
    return this._shallowSchemaRef;
  }

  /**
   * Returns the schema at the given path.
   */
  public schemaAtPath(path: Path): JsonSchema {
    return (
      this.schemaProcessed.value.subSchemaAt(path) ??
      new JsonSchema({}, this._schemaDataPreprocessed, false)
    );
  }

  /**
   * Returns the effective schema at the given path, i.e., the schema that resolved data dependent keywords.
   */
  public effectiveSchemaAtPath(path: Path): EffectiveSchema {
    let currentEffectiveSchema: EffectiveSchema = calculateEffectiveSchema(
      this.schemaProcessed.value,
      useCurrentData().data.value,
      []
    );

    const currentPath = [];
    for (const key of path) {
      currentPath.push(key);
      const schema = currentEffectiveSchema.schema.subSchema(key);

      if (schema?.oneOf) {
        const oneOfSelection = useUserSchemaSelectionStore().currentSelectedOneOfOptions.get(
          pathToString(currentPath)
        );
        if (oneOfSelection !== undefined) {
          currentEffectiveSchema = calculateEffectiveSchema(
            schema.oneOf[oneOfSelection.index],
            useCurrentData().dataAt(currentPath),
            currentPath
          );
          continue;
        }
      }

      currentEffectiveSchema = calculateEffectiveSchema(
        schema,
        useCurrentData().dataAt(currentPath),
        currentPath
      );
    }
    return currentEffectiveSchema;
  }

  public reloadSchema() {
    console.log('reload schema');
    this._schemaDataPreprocessed = ref(preprocessOneTime(this._shallowSchemaRef.value));
    this._schemaProcessed.value = new TopLevelJsonSchema(this.schemaDataPreprocessed.value);
  }
}
