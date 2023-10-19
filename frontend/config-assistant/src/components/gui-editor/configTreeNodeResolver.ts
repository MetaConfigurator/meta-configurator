import {JsonSchema} from '@/schema/JsonSchema';
import type {
  AddPropertyTreeNode,
  ConfigDataTreeNodeType,
  GuiEditorTreeNode,
} from '@/model/ConfigDataTreeNode';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import type {Path} from '@/model/path';
import {useSettingsStore} from '@/store/settingsStore';
import {pathToString} from '@/utility/pathUtils';
import {PropertySorting} from '@/model/SettingsTypes';
import {useSessionStore} from '@/store/sessionStore';
import _ from 'lodash';
import type {EffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import {calculateEffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import {safeMergeSchemas} from '@/schema/mergeAllOfs';

interface TreeNodeResolvingParameters {
  absolutePath: Path;
  relativePath: Path;
  schema: JsonSchema;
  depth: number;
}

/**
 * Creates a {@link GuiEditorTreeNode} from a {@link JsonSchema}.
 *
 * This will not create the children of the nodes, but only the node itself.
 */
export class ConfigTreeNodeResolver {
  /**
   * Creates a tree of {@link GuiEditorTreeNode}s from a {@link JsonSchema} and
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
    schema: JsonSchema,
    parentSchema?: JsonSchema,
    absolutePath: Path = [],
    relativePath: Path = [],
    depth: number = 0,
    nodeType: ConfigDataTreeNodeType = TreeNodeType.SCHEMA_PROPERTY
  ): GuiEditorTreeNode {
    const name = absolutePath[absolutePath.length - 1] ?? '';
    const parentName = absolutePath[absolutePath.length - 2] ?? '';

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
      leaf: this.isLeaf(schema, depth, absolutePath),
    };
  }

  /**
   * Determines whether a node is a leaf node.
   */
  private isLeaf(schema: JsonSchema, depth: number, absolutePath: Path): boolean {
    const dependsOnUserSelection = schema.anyOf.length > 0 || schema.oneOf.length > 0;
    if (dependsOnUserSelection) {
      const path = pathToString(absolutePath);
      const hasUserSelectionOneOf = useSessionStore().currentSelectedOneOfOptions.has(path);
      const hasUserSelectionAnyOf = useSessionStore().currentSelectedAnyOfOptions.has(path);
      if (!(hasUserSelectionOneOf || hasUserSelectionAnyOf)) {
        return true; // no user selection -> leaf node
      }
    }
    const data = useSessionStore().dataAtPath(absolutePath);

    return (
      (!dependsOnUserSelection && data && typeof data !== 'object') || // primitive type in data
      (!schema.hasType('object') && !schema.hasType('array')) || // primitive type in schema
      depth >= useSettingsStore().settingsData.guiEditor.maximumDepth // maximum depth reached
    );
  }

  /**
   * Creates the children of a {@link GuiEditorTreeNode}.
   * @param guiEditorTreeNode The node for which the children should be created.
   */
  public createChildNodesOfNode(guiEditorTreeNode: GuiEditorTreeNode): GuiEditorTreeNode[] {
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
      useSessionStore().dataAtPath(guiEditorTreeNode.data.absolutePath),
      guiEditorTreeNode.data.absolutePath
    );

    guiEditorTreeNode.children = this.createChildNodes(
      guiEditorTreeNode.data.absolutePath,
      guiEditorTreeNode.data.relativePath,
      effectiveSchema,
      guiEditorTreeNode.data.depth
    );
    return guiEditorTreeNode.children as GuiEditorTreeNode[];
  }

  private createChildNodes(
    absolutePath: Path,
    relativePath: Path = [],
    effectiveSchema: EffectiveSchema,
    depth = 0
  ): GuiEditorTreeNode[] {
    const depthLimit = useSettingsStore().settingsData.guiEditor.maximumDepth;
    const schema = effectiveSchema.schema;

    let children: GuiEditorTreeNode[] = [];
    if (schema.oneOf.length > 0) {
      children = this.createOneOfChildrenTreeNodes({absolutePath, relativePath, schema, depth});
    }
    if (schema.anyOf.length > 0) {
      children = children.concat(
        this.createAnyOfChildrenTreeNodes({absolutePath, relativePath, schema, depth})
      );
    }

    if (schema.anyOf.length > 0 || schema.oneOf.length > 0) {
      // don't add further children for oneOf or anyOf nodes
      return children;
    }

    children = [];
    if (schema.hasType('array') && depth < depthLimit) {
      children = children.concat(
        this.createArrayChildrenTreeNodes({absolutePath, relativePath, schema, depth})
      );
    }
    if (schema.hasType('object') && depth < depthLimit) {
      children = children.concat(
        this.createObjectChildrenTreeNodes({absolutePath, relativePath, schema, depth})
      );
    }
    return children;
  }

  /**
   * Creates children nodes for an object node, sorted according to the order defined
   * in the settings.
   */
  private createObjectChildrenTreeNodes(parameters: TreeNodeResolvingParameters) {
    const propertySorting = useSettingsStore().settingsData.guiEditor.propertySorting;
    let result: GuiEditorTreeNode[] = [];

    if (propertySorting === PropertySorting.SCHEMA_ORDER) {
      result = this.createObjectChildrenNodesAccordingToSchemaOrder(parameters);
    }
    if (propertySorting === PropertySorting.DATA_ORDER) {
      result = this.createObjectChildrenNodesAccordingToDataOrder(parameters);
    }

    if (propertySorting === PropertySorting.PRIORITY_ORDER) {
      result = this.createObjectChildrenNodesPriorityOrder(parameters);
    }

    const advanced = this.createTreeNodeOfAdvancedProperty(parameters);

    if (advanced) {
      result.push(advanced);
    }

    const data = useSessionStore().dataAtPath(parameters.absolutePath);
    if (this.shouldAddAddPropertyNode(parameters.schema, data)) {
      return result.concat(this.createAddPropertyTreeNode(parameters));
    }

    return result;
  }

  /**
   * Creates the tree node that represents the "Advanced" section.
   * Returns undefined if there are no advanced properties.
   */
  private createTreeNodeOfAdvancedProperty({
    absolutePath,
    relativePath,
    schema,
    depth,
  }: TreeNodeResolvingParameters): GuiEditorTreeNode | undefined {
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
  private createObjectChildrenNodesPriorityOrder(parameters: TreeNodeResolvingParameters) {
    const requiredProperties = this.createSchemaPropertiesChildNodes(parameters, key =>
      parameters.schema.isRequired(key)
    );
    const optionalProperties = this.createSchemaPropertiesChildNodes(
      parameters,
      key => !parameters.schema.isRequired(key) && !parameters.schema.properties[key].deprecated
    );
    const additionalProperties = this.createDataPropertiesChildNodes(
      parameters,
      key => !parameters.schema.properties || !parameters.schema.properties[key]
    ); // filter out properties that are already in the schema
    const deprecatedProperties = this.createSchemaPropertiesChildNodes(
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
  private createObjectChildrenNodesAccordingToDataOrder(parameters: TreeNodeResolvingParameters) {
    const dataProperties = this.createDataPropertiesChildNodes(parameters);
    const schemaProperties = this.createSchemaPropertiesChildNodes(
      parameters,
      // filter out properties that are already in the data:
      key => !dataProperties.find(node => node.data.name === key)
    );

    return dataProperties.concat(schemaProperties);
  }

  /**
   * Creates property children nodes for an object node, sorted in the same order as the properties occur in the schema.
   */
  private createObjectChildrenNodesAccordingToSchemaOrder(parameters: TreeNodeResolvingParameters) {
    const schemaProperties = this.createSchemaPropertiesChildNodes(parameters);
    const dataProperties = this.createDataPropertiesChildNodes(
      parameters,
      key => !parameters.schema.properties || !parameters.schema.properties[key]
    );
    return schemaProperties.concat(dataProperties);
  }

  private createSchemaPropertiesChildNodes(
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters,
    filter: (key: string) => boolean = () => true,
    advanced = false
  ) {
    return (
      Object.entries(schema.properties)
        // apply given filter
        .filter(([key]) => filter(key))
        // apply "advanced" filter
        .filter(([, value]) => (value?.metaConfigurator?.advanced ?? false) === advanced)
        .map(([key, value]) => {
          const childPath = absolutePath.concat(key);
          return this.createTreeNodeOfProperty(
            value,
            schema,
            childPath,
            relativePath.concat(key),
            depth + 1
          );
        })
    );
  }

  private createDataPropertiesChildNodes(
    {absolutePath, relativePath, schema, depth}: TreeNodeResolvingParameters,
    filter: (key: string) => boolean = () => true
  ) {
    const data = useSessionStore().dataAtPath(absolutePath);
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

  private createArrayChildrenTreeNodes({
    absolutePath,
    relativePath,
    schema,
    depth,
  }: TreeNodeResolvingParameters) {
    const data = useSessionStore().dataAtPath(absolutePath);
    let children: GuiEditorTreeNode[] = [];
    if (Array.isArray(data)) {
      children = data.map((value: any, index: number) => {
        const childPath = absolutePath.concat(index);
        return this.createTreeNodeOfProperty(
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

  private createAddPropertyTreeNode({
    absolutePath,
    relativePath,
    schema,
    depth,
  }: TreeNodeResolvingParameters): AddPropertyTreeNode {
    return {
      data: {
        absolutePath: absolutePath,
        relativePath: relativePath,
        schema: schema.additionalProperties || new JsonSchema({}), // not used
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
  private createOneOfChildrenTreeNodes({
    absolutePath,
    relativePath,
    schema,
    depth,
  }: TreeNodeResolvingParameters) {
    const path = pathToString(absolutePath);
    const userSelectionOneOf = useSessionStore().currentSelectedOneOfOptions.get(path);

    if (userSelectionOneOf !== undefined) {
      const baseSchema = {...schema.jsonSchema};
      delete baseSchema.oneOf;
      const subSchemaOneOf = schema.oneOf[userSelectionOneOf.index];
      const mergedSchema = new JsonSchema({
        allOf: [baseSchema, subSchemaOneOf.jsonSchema ?? {}],
      });
      return [
        this.createTreeNodeOfProperty(mergedSchema, schema, absolutePath, relativePath, depth + 1),
      ];
    }
    return [];
  }

  private createAnyOfChildrenTreeNodes({
    absolutePath,
    relativePath,
    schema,
    depth,
  }: TreeNodeResolvingParameters) {
    const path = pathToString(absolutePath);
    const userSelectionAnyOf = useSessionStore().currentSelectedAnyOfOptions.get(path);

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
          new JsonSchema(mergedSchema),
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
  private shouldAddAddPropertyNode(schema: JsonSchema, data: any) {
    if (Array.isArray(data)) {
      return false;
    }
    if (data !== undefined && typeof data !== 'object') {
      return false;
    }
    if (schema.maxProperties !== undefined && Object.keys(data).length >= schema.maxProperties) {
      return false;
    }
    return !_.isEmpty(schema.patternProperties) || !schema.additionalProperties.isAlwaysFalse;
  }

  /**
   * Determines whether an "add item" node should be added to the tree.
   */
  private shouldAddAddItemNode(schema: JsonSchema, data: any) {
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
