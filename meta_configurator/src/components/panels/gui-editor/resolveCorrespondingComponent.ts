import EnumProperty from '@/components/panels/gui-editor/properties/EnumProperty.vue';
import BooleanProperty from '@/components/panels/gui-editor/properties/BooleanProperty.vue';
import StringProperty from '@/components/panels/gui-editor/properties/StringProperty.vue';
import NumberProperty from '@/components/panels/gui-editor/properties/NumberProperty.vue';
import SimpleObjectProperty from '@/components/panels/gui-editor/properties/SimpleObjectProperty.vue';
import SimpleArrayProperty from '@/components/panels/gui-editor/properties/SimpleArrayProperty.vue';
import type {
  AddItemTreeNodeData,
  ConfigTreeNodeData,
} from '@/components/panels/gui-editor/configDataTreeNode';
import type {VNode} from 'vue';
import {h} from 'vue';
import OneOfSelectionProperty from '@/components/panels/gui-editor/properties/OneOfSelectionProperty.vue';
import AnyOfSelectionProperty from '@/components/panels/gui-editor/properties/AnyOfSelectionProperty.vue';
import {getDataForMode, getSessionForMode, getValidationForMode} from '@/data/useDataLink';
import {typeSchema} from '@/schema/schemaProcessingUtils';
import type {SessionMode} from '@/store/sessionMode';
import OntologyUriProperty from '@/components/panels/gui-editor/properties/OntologyUriProperty.vue';

/**
 * Resolves the corresponding component for a given node.
 * The component is determined by the schema of the node.
 */
export function resolveCorrespondingComponent(
  nodeData: ConfigTreeNodeData | AddItemTreeNodeData,
  mode: SessionMode
): VNode {
  const propsObject = buildProperties(nodeData, mode);

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
      possibleSchemas: nodeData.schema.type.map(type => typeSchema(type, mode)),
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

  if (nodeData.schema.hasType('string') && isOntologyUri(nodeData.schema)) {
    // @ts-ignore
    return h(OntologyUriProperty, {
      ...propsObject,
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

  if (nodeData.schema.hasType('object') || nodeData.schema.properties !== undefined) {
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

function isOntologyUri(schema: any): boolean {
  return (
    schema.metaConfigurator !== undefined &&
    schema.metaConfigurator.ontology !== undefined &&
    schema.metaConfigurator.ontology.mustBeUri
  );
}

function buildProperties(nodeData: ConfigTreeNodeData | AddItemTreeNodeData, mode: SessionMode) {
  return {
    propertyName: nodeData.name,
    propertyData: getDataForMode(mode).dataAt(nodeData.absolutePath),
    propertySchema: nodeData.schema,
    parentSchema: nodeData.parentSchema,
    relativePath: nodeData.relativePath,
    absolutePath: nodeData.absolutePath,
    validationResults: getValidationForMode(mode).currentValidationResult.value.filterForPath(
      nodeData.absolutePath
    ),
    expanded: getSessionForMode(mode).isExpanded(nodeData.absolutePath),
  };
}
