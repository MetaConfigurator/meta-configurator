import type {Ref} from 'vue';
import {ref} from 'vue';
import type {Path} from '@/utility/path';
import {schemaSelectionKey} from '@/data/schemaSelectionKey';
import {SessionMode} from '@/store/sessionMode';
import type {OneOfAnyOfSelectionOption} from '@/data/oneOfAnyOfSelectionOption';

export class ManagedUserSchemaSelection {
  constructor(public mode: SessionMode) {}

  /**
   * Selected options for oneOf in the schema.
   * Key identifies the composition selector. It encodes the data path and composition steps.
   */
  public currentSelectedOneOfOptions: Ref<Map<string, OneOfAnyOfSelectionOption>> = ref(
    new Map<string, OneOfAnyOfSelectionOption>([])
  );
  /**
   * Selected options for type unions in the schema.
   * Key identifies the composition selector. It encodes the data path and composition steps.
   */
  public currentSelectedTypeUnionOptions: Ref<Map<string, OneOfAnyOfSelectionOption>> = ref(
    new Map<string, OneOfAnyOfSelectionOption>([])
  );
  /**
   * Selected options for anyOf in the schema.
   * Key identifies the composition selector. It encodes the data path and composition steps.
   */
  public currentSelectedAnyOfOptions: Ref<Map<string, OneOfAnyOfSelectionOption[]>> = ref(
    new Map<string, OneOfAnyOfSelectionOption[]>([])
  );

  public getSelectedOneOfOption(
    pathOrSelectionKey: Path | string
  ): OneOfAnyOfSelectionOption | undefined {
    return this.currentSelectedOneOfOptions.value.get(this.selectionKey(pathOrSelectionKey));
  }

  public getSelectedTypeUnionOption(
    pathOrSelectionKey: Path | string
  ): OneOfAnyOfSelectionOption | undefined {
    return this.currentSelectedTypeUnionOptions.value.get(this.selectionKey(pathOrSelectionKey));
  }

  public getSelectedAnyOfOptions(
    pathOrSelectionKey: Path | string
  ): OneOfAnyOfSelectionOption[] | undefined {
    return this.currentSelectedAnyOfOptions.value.get(this.selectionKey(pathOrSelectionKey));
  }

  public setSelectedOneOfOption(
    pathOrSelectionKey: Path | string,
    option: OneOfAnyOfSelectionOption
  ): void {
    this.currentSelectedOneOfOptions.value.set(this.selectionKey(pathOrSelectionKey), option);
  }

  public setSelectedTypeUnionOption(
    pathOrSelectionKey: Path | string,
    option: OneOfAnyOfSelectionOption
  ): void {
    this.currentSelectedTypeUnionOptions.value.set(this.selectionKey(pathOrSelectionKey), option);
  }

  public setSelectedAnyOfOptions(
    pathOrSelectionKey: Path | string,
    options: OneOfAnyOfSelectionOption[]
  ): void {
    this.currentSelectedAnyOfOptions.value.set(this.selectionKey(pathOrSelectionKey), options);
  }

  private selectionKey(pathOrSelectionKey: Path | string): string {
    return typeof pathOrSelectionKey === 'string'
      ? pathOrSelectionKey
      : schemaSelectionKey(pathOrSelectionKey);
  }
}
