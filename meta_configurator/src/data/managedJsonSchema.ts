import type {Ref, ShallowRef} from 'vue';
import {ref} from 'vue';
import type {Path} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';
import {watchDebounced} from '@vueuse/core';
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';
import {TopLevelJsonSchemaWrapper} from '@/schema/topLevelJsonSchemaWrapper';
import type {JsonSchemaType, JsonSchemaTypePreprocessed} from '@/schema/jsonSchemaType';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {calculateEffectiveSchema, EffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import {getDataForMode, getUserSelectionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {clearPreprocessedRefSchemaCache} from '@/schema/schemaLazyResolver';

/**
 * This class manages the schema and provides easy access to its content.
 */
export class ManagedJsonSchema {
  /**
   * @param _schemaRaw the shallow ref to the original schema object
   * @param watchSchemaChanges whether to watch for changes in schema data and reprocess the schema accordingly
   * @param mode the corresponding session mode. Useful to determine corresponding data
   */
  constructor(
    private _schemaRaw: ShallowRef<JsonSchemaType>,
    watchSchemaChanges: boolean,
    public mode: SessionMode
  ) {
    this._schemaPreprocessed = ref(preprocessOneTime(this._schemaRaw.value));

    if (watchSchemaChanges) {
      // make sure that the schema is not preprocessed too often
      watchDebounced(this._schemaRaw, () => this.reloadSchema(), {
        debounce: 1000,
        immediate: true,
      });
    }
  }

  private _schemaPreprocessed: Ref<JsonSchemaTypePreprocessed>;

  /**
   * The json schema as a TopLevelJsonSchema object
   */
  private _schemaWrapper?: Ref<TopLevelJsonSchemaWrapper>;

  get schemaPreprocessed(): Ref<JsonSchemaTypePreprocessed> {
    return this._schemaPreprocessed;
  }

  get schemaWrapper(): Ref<TopLevelJsonSchemaWrapper> {
    if (this._schemaWrapper === undefined) {
      this._schemaWrapper = ref(
        new TopLevelJsonSchemaWrapper(this._schemaPreprocessed.value, this.mode)
      );
    }
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
      this.schemaWrapper.value.subSchemaAt(path) ?? new JsonSchemaWrapper({}, this.mode, false)
    );
  }

  /**
   * Returns the effective schema at the given path, i.e., the schema that resolved data dependent keywords.
   */
  public effectiveSchemaAtPath(path: Path): EffectiveSchema {
    let currentEffectiveSchema: EffectiveSchema = calculateEffectiveSchema(
      this.schemaWrapper.value,
      getDataForMode(this.mode).data.value,
      []
    );

    const currentPath = [];
    for (const key of path) {
      currentPath.push(key);
      const schema = currentEffectiveSchema.schema.subSchema(key);

      if (schema?.oneOf) {
        const oneOfSelection = getUserSelectionForMode(
          this.mode
        ).currentSelectedOneOfOptions.value.get(pathToString(currentPath));
        if (oneOfSelection !== undefined) {
          currentEffectiveSchema = calculateEffectiveSchema(
            schema.oneOf[oneOfSelection.index],
            getDataForMode(this.mode).dataAt(currentPath),
            currentPath
          );
          continue;
        }
      }

      currentEffectiveSchema = calculateEffectiveSchema(
        schema,
        getDataForMode(this.mode).dataAt(currentPath),
        currentPath
      );
    }
    return currentEffectiveSchema;
  }

  public reloadSchema() {
    clearPreprocessedRefSchemaCache();
    this._schemaPreprocessed.value = preprocessOneTime(this._schemaRaw.value);
    this.schemaWrapper.value = new TopLevelJsonSchemaWrapper(
      this._schemaPreprocessed.value,
      this.mode
    );
  }
}
