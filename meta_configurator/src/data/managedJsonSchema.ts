import type {Ref, ShallowRef} from 'vue';
import {ref} from 'vue';
import type {Path} from '@/utility/path';
import {schemaSelectionKey, childSchemaSelectionKey} from '@/data/schemaSelectionKey';
import {resolveSchemaSelection} from '@/data/schemaSelection';
import {watchDebounced} from '@vueuse/core';
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';
import {TopLevelJsonSchemaWrapper} from '@/schema/topLevelJsonSchemaWrapper';
import type {JsonSchemaType, JsonSchemaTypePreprocessed} from '@/schema/jsonSchemaType';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {calculateEffectiveSchema, EffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import {getDataForMode, getUserSelectionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {clearPreprocessedRefSchemaCache} from '@/schema/schemaLazyResolver';
import {writeSchemaRequiredDefaultsToData} from '@/schema/writeDefaultsToData';
import {useDataSource} from '@/data/dataSource';
import {detectSchemaFeatures, type SchemaFeatures} from '@/schema/detectSchemaFeatures.ts';
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
    this._schemaFeatures = ref(detectSchemaFeatures(this._schemaRaw.value));

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

  private _schemaFeatures?: Ref<SchemaFeatures>;

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
  public schemaWrapperAtPath(path: Path): JsonSchemaWrapper {
    return (
      this.schemaWrapper.value.subSchemaAt(path) ?? new JsonSchemaWrapper({}, this.mode, false)
    );
  }

  /**
   * Returns the effective schema at the given path, i.e., the schema that resolved data dependent keywords.
   */
  public effectiveSchemaAtPath(path: Path, resolveTargetSelection = true): EffectiveSchema {
    let currentPath: Path = [];
    let selectionKey = schemaSelectionKey(currentPath);
    const data = getDataForMode(this.mode);
    const selections = getUserSelectionForMode(this.mode);
    let effective = calculateEffectiveSchema(
      this.schemaWrapper.value,
      data.data.value,
      currentPath
    );

    for (let depth = 0; depth <= path.length; depth++) {
      // The GUI keeps the target's selectors visible. For other schema consumers,
      // resolve them too. Ancestor selections must always be consumed to find children.
      if (depth < path.length || resolveTargetSelection) {
        // Each successful step reads a distinct, longer selection key. There cannot
        // be more steps than stored choices, even for recursive schemas at one path.
        const selectionCount =
          selections.currentSelectedOneOfOptions.value.size +
          selections.currentSelectedAnyOfOptions.value.size +
          selections.currentSelectedTypeUnionOptions.value.size;
        for (let step = 0; step < selectionCount; step++) {
          const selected = resolveSchemaSelection(effective.schema, selectionKey, selections);
          if (!selected) break;
          selectionKey = selected.schemaSelectionKey;
          effective = calculateEffectiveSchema(
            selected.schema,
            data.dataAt(currentPath),
            currentPath
          );
        }
      }
      if (depth === path.length) break;
      const element = path[depth]!;
      currentPath = currentPath.concat(element);
      selectionKey = childSchemaSelectionKey(selectionKey, element);
      effective = calculateEffectiveSchema(
        effective.schema.subSchema(element),
        data.dataAt(currentPath),
        currentPath
      );
    }
    return new EffectiveSchema(effective.schema, effective.data, currentPath, selectionKey);
  }

  public getCurrentSchemaFeatures(): SchemaFeatures {
    return this._schemaFeatures!.value;
  }

  public reloadSchema() {
    clearPreprocessedRefSchemaCache();
    this._schemaPreprocessed.value = preprocessOneTime(this._schemaRaw.value);
    this.schemaWrapper.value = new TopLevelJsonSchemaWrapper(
      this._schemaPreprocessed.value,
      this.mode
    );
    this._schemaFeatures!.value = detectSchemaFeatures(this._schemaRaw.value);
    if (useDataSource().newSchemaWasFetched) {
      // add defaults to user data, but only when new schema was fetched, not after every schema edit
      const data = getDataForMode(this.mode);
      const writeDataFct = (path: Path, newValue: any) => {
        data.setDataAt(path, newValue);
      };

      writeSchemaRequiredDefaultsToData(
        data.data.value,
        [],
        this.schemaWrapper.value,
        writeDataFct
      );
      useDataSource().newSchemaWasFetched.value = false;
    }
  }
}
