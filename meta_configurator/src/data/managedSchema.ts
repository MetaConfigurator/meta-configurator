import type {Ref, ShallowRef} from 'vue';
import {ref} from 'vue';
import type {Path} from '@/model/path';
import {pathToString} from '@/utility/pathUtils';
import {watchDebounced} from '@vueuse/core';
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';
import {TopLevelJsonSchemaWrapper} from '@/schema/topLevelJsonSchemaWrapper';
import type {JsonSchemaType, JsonSchemaTypePreprocessed} from '@/model/jsonSchemaType';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {calculateEffectiveSchema, EffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import {useCurrentData} from '@/data/useDataLink';
import {useUserSchemaSelectionStore} from '@/store/userSchemaSelectionStore';

/**
 * This class manages the schema and provides easy access to its content.
 */
export class ManagedSchema {
  /**
   * @param _schemaRaw the shallow ref to the original schema object
   * @param watchSchemaChanges whether to watch for changes in schema data and reprocess the schema accordingly
   */
  constructor(private _schemaRaw: ShallowRef<JsonSchemaType>, watchSchemaChanges: boolean) {
    this._schemaPreprocessed = ref(preprocessOneTime(this._schemaRaw.value));
    this._schemaWrapper = ref(new TopLevelJsonSchemaWrapper(this._schemaPreprocessed.value));

    if (watchSchemaChanges) {
      // make sure that the schema is not preprocessed too often
      watchDebounced(this.schemaRaw, () => this.reloadSchema(), {
        debounce: 1000,
        immediate: true,
      });
    }
  }

  private _schemaPreprocessed: Ref<JsonSchemaTypePreprocessed>;

  /**
   * The json schema as a TopLevelJsonSchema object
   */
  private readonly _schemaWrapper: Ref<TopLevelJsonSchemaWrapper>;

  get schemaPreprocessed(): Ref<JsonSchemaTypePreprocessed> {
    return this._schemaPreprocessed;
  }

  get schemaWrapper(): Ref<TopLevelJsonSchemaWrapper> {
    return this._schemaWrapper!;
  }

  get schemaRaw(): Ref<JsonSchemaType> {
    return this._schemaRaw;
  }

  /**
   * Returns the schema at the given path.
   */
  public schemaAtPath(path: Path): JsonSchemaWrapper {
    return (
      this.schemaWrapper.value.subSchemaAt(path) ??
      new JsonSchemaWrapper({}, this._schemaPreprocessed, false)
    );
  }

  /**
   * Returns the effective schema at the given path, i.e., the schema that resolved data dependent keywords.
   */
  public effectiveSchemaAtPath(path: Path): EffectiveSchema {
    let currentEffectiveSchema: EffectiveSchema = calculateEffectiveSchema(
      this.schemaWrapper.value,
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
    this._schemaPreprocessed = ref(preprocessOneTime(this._schemaRaw.value));
    this._schemaWrapper.value = new TopLevelJsonSchemaWrapper(this.schemaPreprocessed.value);
  }
}
