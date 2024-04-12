import EnumProperty from '@/components/gui-editor/properties/EnumProperty.vue';
import BooleanProperty from '@/components/gui-editor/properties/BooleanProperty.vue';
import StringProperty from '@/components/gui-editor/properties/StringProperty.vue';
import NumberProperty from '@/components/gui-editor/properties/NumberProperty.vue';
import SimpleObjectProperty from '@/components/gui-editor/properties/SimpleObjectProperty.vue';
import SimpleArrayProperty from '@/components/gui-editor/properties/SimpleArrayProperty.vue';
import type {
  AddItemTreeNodeData,
  ConfigTreeNodeData,
} from '@/components/gui-editor/configDataTreeNode';
import type {VNode} from 'vue';
import {h} from 'vue';
import {useSessionStore} from '@/store/sessionStore';
import OneOfSelectionProperty from '@/components/gui-editor/properties/OneOfSelectionProperty.vue';
import AnyOfSelectionProperty from '@/components/gui-editor/properties/AnyOfSelectionProperty.vue';
import {useCurrentData, useCurrentSchema} from '@/data/useDataLink';
import {useValidationResult} from '@/schema/validation/useValidation';
import {typeSchema} from '@/schema/schemaUtils';

/**
 * Resolves the corresponding component for a given node.
 * The component is determined by the schema of the node.
 */
export function resolveCorrespondingComponent(
  nodeData: ConfigTreeNodeData | AddItemTreeNodeData
): VNode {
  const propsObject = buildProperties(nodeData);

  if (nodeData.schema.oneOf.length > 0) {
    // @ts-ignore
    return h(OneOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: nodeData.schema.oneOf,
      isTypeUnion: false,
    });
  }
  if (nodeData.schema.anyOf.length > 0) {
    // @ts-ignore
    return h(AnyOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: nodeData.schema.anyOf,
    });
  }

  if (nodeData.schema.enum !== undefined) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: nodeData.schema.enum,
    });
  }

  if (nodeData.schema.type.length > 1) {
    // union type
    // @ts-ignore
    return h(OneOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: nodeData.schema.type.map(type =>
        typeSchema(type, useCurrentSchema().schemaPreprocessed)
      ),
      isTypeUnion: true,
    });
  }

  if (nodeData.schema.hasType('string') && hasTwoOrMoreExamples(nodeData.schema)) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: nodeData.schema.examples,
    });
  }

  if (nodeData.schema.hasType('string')) {
    // @ts-ignore
    return h(StringProperty, propsObject);
  }

  if (nodeData.schema.hasType('boolean')) {
    // @ts-ignore
    return h(BooleanProperty, propsObject);
  }

  if (nodeData.schema.hasType('number') || nodeData.schema.hasType('integer')) {
    // @ts-ignore
    return h(NumberProperty, propsObject);
  }

  if (nodeData.schema.hasType('object')) {
    // @ts-ignore
    return h(SimpleObjectProperty, propsObject);
  }

  if (nodeData.schema.hasType('array')) {
    // @ts-ignore
    return h(SimpleArrayProperty, propsObject);
  }

  if (nodeData.schema.hasType('null')) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: [null],
    });
  }

  return h('p', `Property ${nodeData.name} with type ${nodeData.schema.type} is not supported`);
}

function hasTwoOrMoreExamples(schema: any): boolean {
  return schema.examples !== undefined && schema.examples.length > 1;
}

function buildProperties(nodeData: ConfigTreeNodeData | AddItemTreeNodeData) {
  return {
    propertyName: nodeData.name,
    propertyData: useCurrentData().dataAt(nodeData.absolutePath),
    propertySchema: nodeData.schema,
    parentSchema: nodeData.parentSchema,
    relativePath: nodeData.relativePath,
    absolutePath: nodeData.absolutePath,
    validationResults: useValidationResult().filterForPath(nodeData.absolutePath),
    expanded: useSessionStore().isExpanded(nodeData.absolutePath),
  };
}
