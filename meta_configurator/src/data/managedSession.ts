import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import type {Path} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import type {SearchResult} from '@/utility/search';
import {EffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import type {ConfigDataTreeNode} from '@/components/panels/gui-editor/configDataTreeNode';

export class ManagedSession {
  constructor(public mode: SessionMode) {}

  /**
   * The current path in the data tree. Empty list for root path.
   */
  private _currentPath: Ref<Path> = ref<Path>([]);
  /**
   * The current selected element in the data tree.
   */
  private _currentSelectedElement: Ref<Path> = ref<Path>([]);
  /**
   * All elements that are currently expanded in the data tree.
   * The key is the path as a string, the value is true if the element is expanded.
   */
  private _currentExpandedElements: Ref<Record<string, boolean>> = ref({});
  /**
   * The current search results. Empty, if there is currently no search.
   */
  public currentSearchResults: Ref<SearchResult[]> = ref<SearchResult[]>([]);

  /**
   * The error message of the schema, or null if there is no error.
   * This is the result of the last validation of the schema, not the data.
   */
  public schemaErrorMessage: Ref<string | null> = ref<string | null>(null);

  get currentPath(): Ref<Path> {
    return this._currentPath;
  }

  get currentSelectedElement(): Ref<Path> {
    return this._currentSelectedElement;
  }
  get currentExpandedElements(): Ref<Record<string, boolean>> {
    return this._currentExpandedElements;
  }

  public updateCurrentPath(proposedPath: Path): void {
    this._currentPath.value = proposedPath;
    const schema = this.effectiveSchemaAtCurrentPath.value.schema;
    if (!schema.hasType('object') && !schema.hasType('array')) {
      this._currentPath.value = proposedPath.slice(0, -1);
    }
  }

  public updateCurrentSelectedElement(proposedElement: Path): void {
    this._currentSelectedElement.value = proposedElement;
  }

  public isExpanded(path: Path): boolean {
    return this._currentExpandedElements.value[pathToString(path)] ?? false;
  }

  public expand(path: Path): void {
    const pathAsString = pathToString(path);
    //TODO: Is it really necessary to copy the object here?
    this._currentExpandedElements.value = {
      ...this._currentExpandedElements.value,
      [pathAsString]: true,
    };
  }

  public collapse(path: Path): void {
    const pathAsString = pathToString(path);
    const _currentExpandedElements = {...this._currentExpandedElements.value};
    delete _currentExpandedElements[pathAsString];
    this._currentExpandedElements.value = _currentExpandedElements;
  }

  /**
   * Returns true if the node or any of its children is highlighted.
   */
  public isNodeHighlighted(node: ConfigDataTreeNode) {
    return this.currentSearchResults.value
      .map(searchResult => searchResult.path)
      .map(path => pathToString(path))
      .some(path => node.key && path.startsWith(node.key));
  }

  public effectiveSchemaAtCurrentPath: Ref<EffectiveSchema> = computed(() =>
    getSchemaForMode(this.mode).effectiveSchemaAtPath(this._currentPath.value)
  );

  public dataAtCurrentPath: any = computed(() =>
    getDataForMode(this.mode).dataAt(this._currentPath.value)
  );

  public schemaAtCurrentPath: any = computed(() =>
    getSchemaForMode(this.mode).schemaWrapperAtPath(this._currentPath.value)
  );
}
