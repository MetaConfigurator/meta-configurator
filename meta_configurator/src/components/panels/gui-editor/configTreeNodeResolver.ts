import {
  schemaSelectionKey as selectionKeyForPath,
  childSchemaSelectionKey,
} from '@/data/schemaSelectionKey';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {
  AddPropertyTreeNode,
  ConfigDataTreeNode,
  ConfigDataTreeNodeType,
  GuiEditorTreeNode,
} from '@/components/panels/gui-editor/configDataTreeNode';
import {TreeNodeType} from '@/components/panels/gui-editor/configDataTreeNode';
import type {Path, PathElement} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';
import {sortObjectChildren} from '@/components/panels/gui-editor/sortingUtils';
import _ from 'lodash';
import {calculateEffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import {
  schemaSelectionKind,
  hasSchemaSelection,
  resolveSchemaSelection,
} from '@/data/schemaSelection';
import {useSettings} from '@/settings/useSettings';
import type {SessionMode} from '@/store/sessionMode';
import {getDataForMode, getUserSelectionForMode} from '@/data/useDataLink';

interface TreeNodeResolvingParameters {
  absolutePath: Path;
  relativePath: Path;
  schema: JsonSchemaWrapper;
  schemaSelectionKey: string;
  depth: number;
}

const settings = useSettings();

/**
 * Creates a {@link GuiEditorTreeNode} from a {@link JsonSchemaWrapper}.
 *
 * This will not create the children of the nodes, but only the node itself.
 */
export class ConfigTreeNodeResolver {
  /**
   * Creates a tree of {@link GuiEditorTreeNode}s from a {@link JsonSchemaWrapper} and
   * the corresponding data.
   *
   * @param mode
   * @param schema The schema of the node.
   * @param parentSchema The schema of the parent node.
   * @param absolutePath The path of the parent node.
   * @param relativePath The path of the node relative to the parent node. Defaults to the empty path.
   * @param depth The depth of the node in the tree, starting with 0 for the root node.
   * @param nodeType The type of the node, e.g. {@link TreeNodeType.SCHEMA_PROPERTY} by default.
   */
  public createTreeNodeOfProperty(
    mode: SessionMode,
    schema: JsonSchemaWrapper,
    parentSchema?: JsonSchemaWrapper,
    absolutePath: Path = [],
    relativePath: Path = [],
    depth: number = 0,
    nodeType: ConfigDataTreeNodeType = TreeNodeType.SCHEMA_PROPERTY,
    schemaSelectionKey: string = selectionKeyForPath(absolutePath)
  ): GuiEditorTreeNode {
    const name = absolutePath[absolutePath.length - 1] ?? schema.title ?? 'root';
    const parentName = absolutePath[absolutePath.length - 2] ?? parentSchema?.title ?? 'root';

    return {
      data: {
        name: name,
        schema: schema,
        parentSchema: parentSchema,
        parentName: parentName,
        depth: depth,
        relativePath: relativePath,
        absolutePath: absolutePath,
        schemaSelectionKey,
      },
      type: nodeType,
      key: pathToString(absolutePath),
      children: [],
      leaf: this.isLeaf(mode, schema, depth, absolutePath, schemaSelectionKey),
    };
  }

  /**
   * Determines whether a node is a leaf node.
   */
  private isLeaf(
    mode: SessionMode,
    schema: JsonSchemaWrapper,
    depth: number,
    absolutePath: Path,
    schemaSelectionKey: string
  ): boolean {
    if (depth >= settings.value.guiEditor.maximumDepth) return true;
    if (schemaSelectionKind(schema)) {
      return !hasSchemaSelection(schema, schemaSelectionKey, getUserSelectionForMode(mode));
    }
    const data = getDataForMode(mode).dataAt(absolutePath);
    return Boolean(
      (data && typeof data !== 'object') || (!schema.hasType('object') && !schema.hasType('array'))
    );
  }

  /**
   * Creates the children of a {@link GuiEditorTreeNode}.
   * @param mode
   * @param guiEditorTreeNode The node for which the children should be created.
   */
  public createChildNodesOfNode(
    mode: SessionMode,
    guiEditorTreeNode: GuiEditorTreeNode
  ): GuiEditorTreeNode[] {
    if (guiEditorTreeNode.type === TreeNodeType.ADVANCED_PROPERTY) {
      return guiEditorTreeNode.children as GuiEditorTreeNode[]; // children were already created
    }
    if (
      guiEditorTreeNode.type === TreeNodeType.ADD_ITEM ||
      guiEditorTreeNode.type === TreeNodeType.ADD_PROPERTY
    ) {
      // no children for add item or add property nodes
      return [];
    }
    const effectiveSchema = calculateEffectiveSchema(
      guiEditorTreeNode.data.schema,
      getDataForMode(mode).dataAt(guiEditorTreeNode.data.absolutePath),
      guiEditorTreeNode.data.absolutePath
    );

    guiEditorTreeNode.children = this.createChildNodes(mode, {
      ...guiEditorTreeNode.data,
      schema: effectiveSchema.schema,
      schemaSelectionKey:
        guiEditorTreeNode.data.schemaSelectionKey ??
        selectionKeyForPath(guiEditorTreeNode.data.absolutePath),
    });
    return guiEditorTreeNode.children as GuiEditorTreeNode[];
  }

  private createChildNodes(
    mode: SessionMode,
    parameters: TreeNodeResolvingParameters
  ): GuiEditorTreeNode[] {
    const {absolutePath, relativePath, schema, schemaSelectionKey, depth} = parameters;
    const depthLimit = settings.value.guiEditor.maximumDepth;

    if (schemaSelectionKind(schema)) {
      const selected = resolveSchemaSelection(
        schema,
        schemaSelectionKey,
        getUserSelectionForMode(mode)
      );
      return selected
        ? [
            this.createTreeNodeOfProperty(
              mode,
              selected.schema,
              schema,
              absolutePath,
              relativePath,
              depth + 1,
              TreeNodeType.SCHEMA_PROPERTY,
              selected.schemaSelectionKey
            ),
          ]
        : [];
    }

    let children: GuiEditorTreeNode[] = [];
    if (schema.hasType('array') && depth < depthLimit) {
      children = children.concat(this.createArrayChildrenTreeNodes(mode, parameters));
    }
    if (schema.hasType('object') && depth < depthLimit) {
      children = children.concat(this.createObjectChildrenTreeNodes(mode, parameters));
    }

    if (children.length > settings.value.performance.maxShownChildrenInGuiEditor) {
      children = children.slice(0, settings.value.performance.maxShownChildrenInGuiEditor);
    }

    return children;
  }

  /**
   * Returns the children of an object node, ordered according to the GUI editor's
   * `propertySorting` setting and followed by the optional Advanced and AddProperty nodes.
   */
  private createObjectChildrenTreeNodes(
    mode: SessionMode,
    parameters: TreeNodeResolvingParameters
  ) {
    const result = sortObjectChildren(
      settings.value.guiEditor.propertySorting,
      parameters.schema,
      filter => this.createSchemaPropertiesChildNodes(mode, parameters, filter),
      filter => this.createDataPropertiesChildNodes(mode, parameters, filter)
    );

    const advanced = this.createTreeNodeOfAdvancedProperty(mode, parameters);

    if (advanced) {
      result.push(advanced);
    }

    const data = getDataForMode(mode).dataAt(parameters.absolutePath);
    if (this.shouldAddAddPropertyNode(parameters.schema, data)) {
      return result.concat(this.createAddPropertyTreeNode(mode, parameters));
    }

    return result;
  }

  /**
   * Creates the tree node that represents the "Advanced" section.
   * Returns undefined if there are no advanced properties.
   */
  private createTreeNodeOfAdvancedProperty(
    mode: SessionMode,
    parameters: TreeNodeResolvingParameters
  ): GuiEditorTreeNode | undefined {
    const {absolutePath, relativePath, schema, schemaSelectionKey, depth} = parameters;
    const advanced: ConfigDataTreeNode = {
      data: {
        name: schema.title ?? '',
        schema: schema,
        parentSchema: schema,
        parentName: '',
        depth: 0,
        relativePath: relativePath,
        absolutePath: absolutePath,
        schemaSelectionKey,
      },
      type: TreeNodeType.ADVANCED_PROPERTY,
      key: pathToString(absolutePath) + '$advanced',
      children: this.createSchemaPropertiesChildNodes(
        mode,
        {...parameters, depth: depth + 1},
        () => true,
        true
      ),
    };

    if ((advanced.children?.length ?? 0) > 0) {
      return advanced;
    }

    return undefined;
  }

  /** Descend one data edge, keeping branch identity and both paths in sync. */
  private createDataChild(
    mode: SessionMode,
    parent: TreeNodeResolvingParameters,
    key: PathElement,
    schema: JsonSchemaWrapper,
    type: ConfigDataTreeNodeType = TreeNodeType.SCHEMA_PROPERTY
  ): GuiEditorTreeNode {
    return this.createTreeNodeOfProperty(
      mode,
      schema,
      parent.schema,
      parent.absolutePath.concat(key),
      parent.relativePath.concat(key),
      parent.depth + 1,
      type,
      childSchemaSelectionKey(parent.schemaSelectionKey, key)
    );
  }

  private createSchemaPropertiesChildNodes(
    mode: SessionMode,
    parameters: TreeNodeResolvingParameters,
    filter: (key: string) => boolean = () => true,
    advanced = false
  ) {
    const {absolutePath, schema} = parameters;
    return (
      Object.entries(schema.properties)
        // apply given filter
        .filter(([key]) => filter(key))
        // apply "advanced" filter
        .filter(
          ([key, value]) =>
            this.isKeepInAdvancedSection(mode, value, absolutePath.concat(key)) === advanced
        )
        .map(([key, value]) => this.createDataChild(mode, parameters, key, value))
    );
  }

  private isKeepInAdvancedSection(
    mode: SessionMode,
    schema: JsonSchemaWrapper,
    absolutePath: Path
  ) {
    // only keep objects in advanced section if they are marked as advanced and do not contain data
    return (
      (schema.metaConfigurator?.advanced ?? false) &&
      getDataForMode(mode).dataAt(absolutePath) === undefined
    );
  }

  private createDataPropertiesChildNodes(
    mode: SessionMode,
    parameters: TreeNodeResolvingParameters,
    filter: (key: string) => boolean = () => true
  ) {
    const {absolutePath, schema} = parameters;
    const data = getDataForMode(mode).dataAt(absolutePath);
    if (!data) {
      return [];
    }

    return (
      Object.entries(data)
        // apply given filter
        .filter(([key]) => filter(key))
        .map(([key]) => {
          if (schema.properties && schema.properties[key]) {
            return this.createDataChild(mode, parameters, key, schema.properties[key]);
          }

          let childSchema = schema.additionalProperties;
          let type = TreeNodeType.ADDITIONAL_PROPERTY;

          // check if the property is a pattern property
          Object.entries(schema.patternProperties).forEach(([pattern, patternSchema]) => {
            if (new RegExp(pattern).test(key)) {
              childSchema = patternSchema;
              type = TreeNodeType.PATTERN_PROPERTY;
            }
          });

          return this.createDataChild(mode, parameters, key, childSchema, type);
        })
    );
  }

  private createArrayChildrenTreeNodes(mode: SessionMode, parameters: TreeNodeResolvingParameters) {
    const {absolutePath, relativePath, schema, depth} = parameters;
    const data = getDataForMode(mode).dataAt(absolutePath);
    let children: GuiEditorTreeNode[] = [];
    if (Array.isArray(data)) {
      children = data.map((_, index) =>
        this.createDataChild(mode, parameters, index, schema.items)
      );
    }
    let exceedsChildrenLimit = false;
    if (children.length > settings.value.performance.maxShownChildrenInGuiEditor) {
      children = children.slice(0, settings.value.performance.maxShownChildrenInGuiEditor);
      exceedsChildrenLimit = true;
    }
    if (this.shouldAddAddItemNode(schema, data) && !exceedsChildrenLimit) {
      return children.concat(
        this.createAddItemTreeNode({absolutePath, relativePath, schema, depth: depth + 1}, children)
      );
    }
    return children;
  }

  private createAddPropertyTreeNode(
    mode: SessionMode,
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters
  ): AddPropertyTreeNode {
    return {
      data: {
        absolutePath: absolutePath,
        relativePath: relativePath,
        schema: schema.additionalProperties || new JsonSchemaWrapper({}, mode, false), // not used
        parentSchema: schema,
        name: '', // name is not used for add property node, but we keep it for easier type checking
        depth: depth,
      },
      type: TreeNodeType.ADD_PROPERTY,
      key: pathToString(absolutePath.concat('add-property')),
      children: [],
      leaf: true,
    };
  }

  private createAddItemTreeNode(
    {
      absolutePath,
      relativePath,
      schema,
      depth,
    }: Omit<TreeNodeResolvingParameters, 'schemaSelectionKey'>,
    children: GuiEditorTreeNode[]
  ): GuiEditorTreeNode {
    const pathWithIndex = relativePath.concat(children.length);
    const absolutePathWithIndex = absolutePath.concat(children.length);
    let label = 'Add item';
    if (schema.items.title) {
      label = 'Add ' + schema.items.title;
    } else if (absolutePath.length > 0) {
      label = 'Add item (' + absolutePath[absolutePath.length - 1] + ')';
    }
    return {
      data: {
        schema: schema.items,
        depth: depth,
        relativePath: pathWithIndex,
        absolutePath: absolutePathWithIndex,
        name: children.length,
        label: label,
      },
      type: TreeNodeType.ADD_ITEM,
      key: pathToString(absolutePathWithIndex),
      children: [],
      leaf: true,
    };
  }

  /**
   * Determines whether an "add property" node should be added to the tree.
   */
  private shouldAddAddPropertyNode(schema: JsonSchemaWrapper, data: any) {
    if (Array.isArray(data)) {
      return false;
    }
    if (data !== undefined && typeof data !== 'object') {
      // if the data is a primitive type, we cannot add a property
      return false;
    }
    if (
      schema.maxProperties !== undefined &&
      data !== null &&
      typeof data === 'object' &&
      Object.keys(data).length >= schema.maxProperties
    ) {
      return false;
    }
    if (schema.metaConfigurator?.hideAddPropertyButton) {
      return false;
    }

    // if the user has not specified a custom schema for additional properties, we can hide the button
    if (
      settings.value.guiEditor.hideAddPropertyButton &&
      schema.additionalProperties.isAlwaysTrue &&
      _.isEmpty(schema.patternProperties)
    ) {
      return false;
    }

    return !_.isEmpty(schema.patternProperties) || !schema.additionalProperties.isAlwaysFalse;
  }

  /**
   * Determines whether an "add item" node should be added to the tree.
   */
  private shouldAddAddItemNode(schema: JsonSchemaWrapper, data: any) {
    // note that the add item node is offered even when the data at this node is not an
    // array (e.g. the default empty object of a new document, or leftover data from an
    // earlier schema): the GUI would otherwise appear empty for array schemas with no
    // way to fix the data. Adding an item then replaces the old value (undo is available).
    if (schema.maxItems !== undefined && Array.isArray(data) && data.length >= schema.maxItems) {
      return false;
    }
    if (schema.items.isAlwaysFalse) {
      return Array.isArray(data) && data.length < (schema.prefixItems?.length ?? 0);
    }
    return true;
  }
}
