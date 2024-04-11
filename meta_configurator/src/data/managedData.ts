import type {Ref, ComputedRef, ShallowRef, WritableComputedRef} from 'vue';
import {computed, ref, triggerRef} from 'vue';
import {useDataConverter} from '@/formats/formatRegistry';
import type {Path} from '@/model/path';
import {dataAt} from '@/utility/resolveDataAtPath';
import {pathToString} from '@/utility/pathUtils';
import _ from 'lodash';
import {useDebouncedRefHistory} from '@vueuse/core';
import type {UndoManager} from '@/data/undoManager';

/**
 * This class manages the data and keeps the data and the string representation in sync.
 */
export class ManagedData {
  /**
   * @param shallowDataRef   the shallow ref to the data
   */
  constructor(public shallowDataRef: ShallowRef<any>) {
    this.data.value = shallowDataRef.value;
  }

  // variable that stores the string representation in the case that it could not be parsed
  // this is null if the string representation is valid
  private readonly unparseableDataString: Ref<string | null> = ref(null);

  private history: UndoManager | null = null;

  /**
   * The data. This is a computed property that keeps the data and the string representation in sync.
   */
  public readonly data: WritableComputedRef<any> = computed({
    get: () => {
      return this.shallowDataRef.value;
    },
    set: value => {
      this.shallowDataRef.value = value;
      this.unparseableDataString.value = null;
    },
  });

  /**
   * The string representation of the data. This is a computed property that keeps the data and the string
   * representation in sync.
   * In case the string representation can not be parsed, this property still contains the string
   * but the data will not be updated.
   */
  public readonly unparsedData: WritableComputedRef<string> = computed({
    get: () => {
      if (this.unparseableDataString.value !== null) {
        return this.unparseableDataString.value;
      }
      const {stringify} = useDataConverter();
      return stringify(this.shallowDataRef.value);
    },
    set: (value: string) => {
      const {parse} = useDataConverter();

      try {
        this.shallowDataRef.value = parse(value);
        this.unparseableDataString.value = null;
      } catch (e) {
        this.unparseableDataString.value = value;
      }
    },
  });

  /**
   * This function updates the data using the given updater function and triggers the shallow data ref.
   * This can be used to update sub properties of the data.
   *
   * @param updater the function that updates the data. If this function returns false, the shallow data ref
   *                will not be triggered. This can be used to prevent unnecessary updates.
   */
  public updateData(updater: (data: any) => boolean | void): void {
    const updated = updater(this.data.value);
    if (updated !== false) {
      triggerRef(this.shallowDataRef);
    }
  }

  /**
   * Sets the data at the given path to the given value.
   *
   * @param path  the path to the data
   * @param value the new value
   */
  public setDataAt(path: Path, value: any): void {
    if (path.length === 0) {
      this.setData(value);
      return;
    }
    const dataAtPath = this.dataAt(path);
    if (_.isEqual(dataAtPath, value)) {
      return; // nothing to do
    }
    this.updateData(data => {
      _.set(data, pathToString(path), value);
    });
  }

  /**
   * Removes the data at the given path.
   *
   * @param path the path to the data
   */
  public removeDataAt(path: Path): void {
    if (path.length === 0) {
      this.setData({});
      return;
    }
    this.updateData(data => {
      const parentData = dataAt(path.slice(0, -1), data);
      if (Array.isArray(parentData)) {
        const indexToRemove = path[path.length - 1] as number;

        if (parentData.length <= indexToRemove) {
          return false; // nothing to remove
        }

        parentData.splice(indexToRemove, 1);
        return true;
      }
      return _.unset(data, pathToString(path));
    });
  }

  /**
   * Sets the data to the given value.
   *
   * @param data the new data
   */
  public setData(data: any): void {
    this.data.value = data;
  }

  /**
   * Returns the data at the given path.
   *
   * @param path the path to the data
   */
  public dataAt(path: Path): any | undefined {
    return dataAt(path, this.data.value);
  }

  public get undoManager(): UndoManager {
    if (this.history === null) {
      this.history = useDebouncedRefHistory(this.unparsedData, {
        capacity: 150,
        debounce: 100,
      });
    }
    return this.history;
  }
}
