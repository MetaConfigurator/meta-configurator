import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {
  AddPropertyTreeNode,
  ConfigDataTreeNodeType,
  GuiEditorTreeNode,
} from '@/components/gui-editor/configDataTreeNode';
import {TreeNodeType} from '@/components/gui-editor/configDataTreeNode';
import type {Path} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';
import {PropertySorting} from '@/settings/settingsTypes';
import _ from 'lodash';
import type {EffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import {calculateEffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import {safeMergeSchemas} from '@/schema/mergeAllOfs';
import {useSettings} from '@/settings/useSettings';
import {typeSchema} from '@/schema/schemaUtils';
import type {SessionMode} from '@/store/sessionMode';
import {getDataForMode, getUserSelectionForMode} from '@/data/useDataLink';

interface TreeNodeResolvingParameters {
  absolutePath: Path;
  relativePath: Path;
  schema: JsonSchemaWrapper;
  depth: number;
}

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
    nodeType: ConfigDataTreeNodeType = TreeNodeType.SCHEMA_PROPERTY
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
      },
      type: nodeType,
      key: pathToString(absolutePath),
      children: [],
      leaf: this.isLeaf(mode, schema, depth, absolutePath),
    };
  }

  /**
   * Determines whether a node is a leaf node.
   */
  private isLeaf(
    mode: SessionMode,
    schema: JsonSchemaWrapper,
    depth: number,
    absolutePath: Path
  ): boolean {
    const dependsOnUserSelection = this.dependsOnUserSelection(schema);
    if (dependsOnUserSelection) {
      const path = pathToString(absolutePath);
      const hasUserSelectionOneOf =
        getUserSelectionForMode(mode).currentSelectedOneOfOptions.value.has(path);
      const hasUserSelectionAnyOf =
        getUserSelectionForMode(mode).currentSelectedAnyOfOptions.value.has(path);
      const hasUserSelectionTypeUnion =
        getUserSelectionForMode(mode).currentSelectedTypeUnionOptions.value.has(path);
      if (!(hasUserSelectionOneOf || hasUserSelectionAnyOf || hasUserSelectionTypeUnion)) {
        return true; // no user selection -> leaf node
      }
    }
    const data = getDataForMode(mode).dataAt(absolutePath);

    return (
      (!dependsOnUserSelection && data && typeof data !== 'object') || // primitive type in data
      (!schema.hasType('object') && !schema.hasType('array')) || // primitive type in schema
      depth >= useSettings().guiEditor.maximumDepth // maximum depth reached
    );
  }

  /**
   * True if the schema depends on the user selection, i.e., if it has anyOf, oneOf or multiple types.
   */
  private dependsOnUserSelection(schema: JsonSchemaWrapper) {
    return schema.anyOf.length > 0 || schema.oneOf.length > 0 || schema.type.length > 1;
  }

  /**
   * Creates the children of a {@link GuiEditorTreeNode}.
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

    guiEditorTreeNode.children = this.createChildNodes(
      mode,
      guiEditorTreeNode.data.absolutePath,
      guiEditorTreeNode.data.relativePath,
      effectiveSchema,
      guiEditorTreeNode.data.depth
    );
    return guiEditorTreeNode.children as GuiEditorTreeNode[];
  }

  private createChildNodes(
    mode: SessionMode,
    absolutePath: Path,
    relativePath: Path = [],
    effectiveSchema: EffectiveSchema,
    depth = 0
  ): GuiEditorTreeNode[] {
    const depthLimit = useSettings().guiEditor.maximumDepth;
    const schema = effectiveSchema.schema;

    let children: GuiEditorTreeNode[] = [];
    if (schema.type.length > 1) {
      children = this.createTypeUnionChildrenTreeNodes(mode, {
        absolutePath,
        relativePath,
        schema,
        depth,
      });
    }
    if (schema.oneOf.length > 0) {
      children = this.createOneOfChildrenTreeNodes(mode, {
        absolutePath,
        relativePath,
        schema,
        depth,
      });
    }
    if (schema.anyOf.length > 0) {
      children = children.concat(
        this.createAnyOfChildrenTreeNodes(mode, {absolutePath, relativePath, schema, depth})
      );
    }

    if (this.dependsOnUserSelection(schema)) {
      // no further children should be added, those children get added to the corresponding nodes
      return children;
    }

    children = [];
    if (schema.hasType('array') && depth < depthLimit) {
      children = children.concat(
        this.createArrayChildrenTreeNodes(mode, {absolutePath, relativePath, schema, depth})
      );
    }
    if (schema.hasType('object') && depth < depthLimit) {
      children = children.concat(
        this.createObjectChildrenTreeNodes(mode, {absolutePath, relativePath, schema, depth})
      );
    }
    return children;
  }

  /**
   * Creates children nodes for an object node, sorted according to the order defined
   * in the settings.
   */
  private createObjectChildrenTreeNodes(
    mode: SessionMode,
    parameters: TreeNodeResolvingParameters
  ) {
    const propertySorting = useSettings().guiEditor.propertySorting;
    let result: GuiEditorTreeNode[] = [];

    if (propertySorting === PropertySorting.SCHEMA_ORDER) {
      result = this.createObjectChildrenNodesAccordingToSchemaOrder(mode, parameters);
    }
    if (propertySorting === PropertySorting.DATA_ORDER) {
      result = this.createObjectChildrenNodesAccordingToDataOrder(mode, parameters);
    }

    if (propertySorting === PropertySorting.PRIORITY_ORDER) {
      result = this.createObjectChildrenNodesPriorityOrder(mode, parameters);
    }

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
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters
  ): GuiEditorTreeNode | undefined {
    const advanced = {
      data: {
        name: schema.title ?? '',
        schema: schema,
        parentSchema: schema,
        parentName: '',
        depth: 0,
        relativePath: relativePath,
        absolutePath: absolutePath,
      },
      type: TreeNodeType.ADVANCED_PROPERTY,
      key: pathToString(absolutePath) + '$advanced',
      children: this.createSchemaPropertiesChildNodes(
        mode,
        {
          absolutePath,
          relativePath,
          schema,
          depth: depth + 1,
        },
        () => true,
        true
      ),
    };

    if (advanced.children.length > 0) {
      return advanced;
    }

    return undefined;
  }

  /**
   * Creates children nodes for an object node, sorted according to the priority order.
   * The priority order is:
   * 1. required properties
   * 2. optional properties
   * 3. additional properties (including pattern properties)
   * 4. deprecated properties
   */
  private createObjectChildrenNodesPriorityOrder(
    mode: SessionMode,
    parameters: TreeNodeResolvingParameters
  ) {
    const requiredProperties = this.createSchemaPropertiesChildNodes(mode, parameters, key =>
      parameters.schema.isRequired(key)
    );
    const optionalProperties = this.createSchemaPropertiesChildNodes(
      mode,
      parameters,
      key => !parameters.schema.isRequired(key) && !parameters.schema.properties[key].deprecated
    );
    const additionalProperties = this.createDataPropertiesChildNodes(
      mode,
      parameters,
      key => !parameters.schema.properties || !parameters.schema.properties[key]
    ); // filter out properties that are already in the schema
    const deprecatedProperties = this.createSchemaPropertiesChildNodes(
      mode,
      parameters,
      key => parameters.schema.properties[key].deprecated && !parameters.schema.isRequired(key)
    );
    return requiredProperties.concat(
      optionalProperties,
      additionalProperties,
      deprecatedProperties
    );
  }

  /**
   * Creates property children nodes for an object node, sorted in the same order as the properties occur in the data.
   */
  private createObjectChildrenNodesAccordingToDataOrder(
    mode: SessionMode,
    parameters: TreeNodeResolvingParameters
  ) {
    const dataProperties = this.createDataPropertiesChildNodes(mode, parameters);
    const schemaProperties = this.createSchemaPropertiesChildNodes(
      mode,
      parameters,
      key => !dataProperties.find(node => node.data.name === key)
    );

    return dataProperties.concat(schemaProperties);
  }

  /**
   * Creates property children nodes for an object node, sorted in the same order as the properties occur in the schema.
   */
  private createObjectChildrenNodesAccordingToSchemaOrder(
    mode: SessionMode,
    parameters: TreeNodeResolvingParameters
  ) {
    const schemaProperties = this.createSchemaPropertiesChildNodes(mode, parameters);
    const dataProperties = this.createDataPropertiesChildNodes(
      mode,
      parameters,
      key => !parameters.schema.properties || !parameters.schema.properties[key]
    );
    return schemaProperties.concat(dataProperties);
  }

  private createSchemaPropertiesChildNodes(
    mode: SessionMode,
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters,
    filter: (key: string) => boolean = () => true,
    advanced = false
  ) {
    return (
      Object.entries(schema.properties)
        // apply given filter
        .filter(([key]) => filter(key))
        // apply "advanced" filter
        .filter(
          ([key, value]) =>
            this.isKeepInAdvancedSection(mode, value, absolutePath.concat(key)) === advanced
        )
        .map(([key, value]) => {
          const childPath = absolutePath.concat(key);
          return this.createTreeNodeOfProperty(
            mode,
            value,
            schema,
            childPath,
            relativePath.concat(key),
            depth + 1
          );
        })
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
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters,
    filter: (key: string) => boolean = () => true
  ) {
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
            const childPath = absolutePath.concat(key);
            return this.createTreeNodeOfProperty(
              mode,
              schema.properties[key],
              schema,
              childPath,
              relativePath.concat(key),
              depth + 1
            );
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

          const childPath = absolutePath.concat(key);
          return this.createTreeNodeOfProperty(
            mode,
            childSchema,
            schema,
            childPath,
            relativePath.concat(key),
            depth + 1,
            type
          );
        })
    );
  }

  private createArrayChildrenTreeNodes(
    mode: SessionMode,
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters
  ) {
    const data = getDataForMode(mode).dataAt(absolutePath);
    let children: GuiEditorTreeNode[] = [];
    if (Array.isArray(data)) {
      children = data.map((value: any, index: number) => {
        const childPath = absolutePath.concat(index);
        return this.createTreeNodeOfProperty(
          mode,
          schema.items,
          schema,
          childPath,
          relativePath.concat(index),
          depth + 1
        );
      });
    }
    if (this.shouldAddAddItemNode(schema, data)) {
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
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters,
    children: GuiEditorTreeNode[]
  ): GuiEditorTreeNode {
    const pathWithIndex = relativePath.concat(children.length);
    const absolutePathWithIndex = absolutePath.concat(children.length);
    return {
      data: {
        schema: schema.items,
        depth: depth,
        relativePath: pathWithIndex,
        absolutePath: absolutePathWithIndex,
        name: children.length,
      },
      type: TreeNodeType.ADD_ITEM,
      key: pathToString(absolutePathWithIndex),
      children: [],
      leaf: true,
    };
  }

  private createTypeUnionChildrenTreeNodes(
    mode: SessionMode,
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters
  ) {
    const userSelectionOneOf =
      getUserSelectionForMode(mode).getSelectedTypeUnionOption(absolutePath);

    if (userSelectionOneOf !== undefined) {
      const baseSchema = {...schema.jsonSchema};
      delete baseSchema.type;
      const newTypeSchema = typeSchema(schema.type[userSelectionOneOf.index], mode);
      const mergedSchema = new JsonSchemaWrapper(
        {
          allOf: [baseSchema, newTypeSchema.jsonSchema ?? {}],
        },
        mode
      );
      return [
        this.createTreeNodeOfProperty(
          mode,
          mergedSchema,
          schema,
          absolutePath,
          relativePath,
          depth + 1
        ),
      ];
    }
    return [];
  }

  private createOneOfChildrenTreeNodes(
    mode: SessionMode,
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters
  ) {
    const userSelectionOneOf = getUserSelectionForMode(mode).getSelectedOneOfOption(absolutePath);

    if (userSelectionOneOf !== undefined) {
      const baseSchema = {...schema.jsonSchema};
      delete baseSchema.oneOf;
      const subSchemaOneOf = schema.oneOf[userSelectionOneOf.index];
      const mergedSchema = new JsonSchemaWrapper(
        {
          allOf: [baseSchema, subSchemaOneOf.jsonSchema ?? {}],
        },
        mode
      );
      return [
        this.createTreeNodeOfProperty(
          mode,
          mergedSchema,
          schema,
          absolutePath,
          relativePath,
          depth + 1
        ),
      ];
    }
    return [];
  }

  private createAnyOfChildrenTreeNodes(
    mode: SessionMode,
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters
  ) {
    const userSelectionAnyOf = getUserSelectionForMode(mode).getSelectedAnyOfOptions(absolutePath);

    if (userSelectionAnyOf !== undefined) {
      const baseSchema = {...schema.jsonSchema};
      delete baseSchema.anyOf;
      const subSchemasAnyOf = userSelectionAnyOf.map(userSelectionEntry => {
        return schema.anyOf[userSelectionEntry.index].jsonSchema ?? {};
      });
      const mergedSchema = safeMergeSchemas(baseSchema, ...subSchemasAnyOf);
      if (!mergedSchema) {
        // user selected schemas that are not compatible -> can never be fulfilled
        return [];
      }
      return [
        this.createTreeNodeOfProperty(
          mode,
          new JsonSchemaWrapper(mergedSchema, mode),
          schema,
          absolutePath,
          relativePath,
          depth + 1
        ),
      ];
    }
    return [];
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
    if (schema.maxProperties !== undefined && Object.keys(data).length >= schema.maxProperties) {
      return false;
    }
    if (schema.metaConfigurator?.hideAddPropertyButton) {
      return false;
    }

    return !_.isEmpty(schema.patternProperties) || !schema.additionalProperties.isAlwaysFalse;
  }

  /**
   * Determines whether an "add item" node should be added to the tree.
   */
  private shouldAddAddItemNode(schema: JsonSchemaWrapper, data: any) {
    if (data !== undefined && !Array.isArray(data)) {
      return false;
    }
    if (schema.maxItems !== undefined && data !== undefined && data.length >= schema.maxItems) {
      return false;
    }
    if (schema.items.isAlwaysFalse) {
      return data?.length < schema.prefixItems?.length ?? 0;
    }
    return true;
  }
}
