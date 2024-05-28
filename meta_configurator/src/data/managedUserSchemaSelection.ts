import type {Ref} from 'vue';
import {ref} from 'vue';
import type {Path} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';
import {SessionMode} from '@/store/sessionMode';
import type {OneOfAnyOfSelectionOption} from '@/data/oneOfAnyOfSelectionOption';

export class ManagedUserSchemaSelection {
  constructor(public mode: SessionMode) {}

  /**
   * Selected options for oneOf in the schema.
   * Key is the path as a string, value is the selected option.
   */
  public currentSelectedOneOfOptions: Ref<Map<string, OneOfAnyOfSelectionOption>> = ref(
    new Map<string, OneOfAnyOfSelectionOption>([])
  );
  /**
   * Selected options for type unions in the schema.
   * Key is the path as a string, value is the selected option.
   */
  public currentSelectedTypeUnionOptions: Ref<Map<string, OneOfAnyOfSelectionOption>> = ref(
    new Map<string, OneOfAnyOfSelectionOption>([])
  );
  /**
   * Selected options for anyOf in the schema.
   * Key is the path as a string, value is an array of selected options.
   */
  public currentSelectedAnyOfOptions: Ref<Map<string, OneOfAnyOfSelectionOption[]>> = ref(
    new Map<string, OneOfAnyOfSelectionOption[]>([])
  );

  public getSelectedOneOfOption(path: Path): OneOfAnyOfSelectionOption | undefined {
    return this.currentSelectedOneOfOptions.value.get(pathToString(path));
  }

  public getSelectedTypeUnionOption(path: Path): OneOfAnyOfSelectionOption | undefined {
    return this.currentSelectedTypeUnionOptions.value.get(pathToString(path));
  }

  public getSelectedAnyOfOptions(path: Path): OneOfAnyOfSelectionOption[] | undefined {
    return this.currentSelectedAnyOfOptions.value.get(pathToString(path));
  }

  public setSelectedOneOfOption(path: Path, option: OneOfAnyOfSelectionOption): void {
    this.currentSelectedOneOfOptions.value.set(pathToString(path), option);
  }

  public setSelectedTypeUnionOption(path: Path, option: OneOfAnyOfSelectionOption): void {
    this.currentSelectedTypeUnionOptions.value.set(pathToString(path), option);
  }

  public setSelectedAnyOfOptions(path: Path, options: OneOfAnyOfSelectionOption[]): void {
    this.currentSelectedAnyOfOptions.value.set(pathToString(path), options);
  }
}
