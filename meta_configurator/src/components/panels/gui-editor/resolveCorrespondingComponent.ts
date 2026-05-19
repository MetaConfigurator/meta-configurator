import EnumProperty from '@/components/panels/gui-editor/properties/EnumProperty.vue';
import BooleanProperty from '@/components/panels/gui-editor/properties/BooleanProperty.vue';
import StringProperty from '@/components/panels/gui-editor/properties/StringProperty.vue';
import NumberProperty from '@/components/panels/gui-editor/properties/NumberProperty.vue';
import SimpleObjectProperty from '@/components/panels/gui-editor/properties/SimpleObjectProperty.vue';
import SimpleArrayProperty from '@/components/panels/gui-editor/properties/SimpleArrayProperty.vue';
import DateProperty from '@/components/panels/gui-editor/properties/DateProperty.vue';
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
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {
  representativeCompositionSchema,
  shouldShowCompositionSelection,
} from '@/components/panels/gui-editor/guiSchemaCompositionUtils';

/**
 * Resolves the corresponding component for a given node.
 * The component is determined by the schema of the node.
 */
export function resolveCorrespondingComponent(
  nodeData: ConfigTreeNodeData | AddItemTreeNodeData,
  mode: SessionMode
): VNode {
  return resolveCorrespondingComponentForSchema(nodeData, nodeData.schema, mode);
}

function resolveCorrespondingComponentForSchema(
  nodeData: ConfigTreeNodeData | AddItemTreeNodeData,
  schema: JsonSchemaWrapper,
  mode: SessionMode
): VNode {
  const propsObject = buildProperties(nodeData, mode, schema);

  if (schema.oneOf.length > 0) {
    if (!shouldShowCompositionSelection(schema, schema.oneOf, 'oneOf', mode)) {
      const representativeSchema = representativeCompositionSchema(
        schema,
        schema.oneOf,
        'oneOf',
        mode
      );
      if (representativeSchema) {
        return resolveCorrespondingComponentForSchema(nodeData, representativeSchema, mode);
      }
    }
    // @ts-ignore
    return h(OneOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: schema.oneOf,
      isTypeUnion: false,
    });
  }
  if (schema.anyOf.length > 0) {
    if (!shouldShowCompositionSelection(schema, schema.anyOf, 'anyOf', mode)) {
      const representativeSchema = representativeCompositionSchema(
        schema,
        schema.anyOf,
        'anyOf',
        mode
      );
      if (representativeSchema) {
        return resolveCorrespondingComponentForSchema(nodeData, representativeSchema, mode);
      }
    }
    // @ts-ignore
    return h(AnyOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: schema.anyOf,
    });
  }

  if (schema.enum !== undefined) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: schema.enum,
    });
  }

  if (schema.type.length > 1) {
    // union type
    // @ts-ignore
    return h(OneOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: schema.type.map(type => typeSchema(type, mode)),
      isTypeUnion: true,
    });
  }

  if (schema.hasType('string') && hasTwoOrMoreExamples(schema)) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: schema.examples,
    });
  }

  if (schema.hasType('string') && isOntologyUri(schema)) {
    // @ts-ignore
    return h(OntologyUriProperty, {
      ...propsObject,
    });
  }
  if (schema.hasType('string') && schema.format === 'date') {
    // @ts-ignore
    return h(DateProperty, propsObject);
  }

  if (schema.hasType('string') && schema.format === 'email') {
    if (!schema.examples || schema.examples.length === 0) {
      // if there is no example e-mail provided, add one directly to the schema
      const underlyingSchema = schema.jsonSchema;
      if (underlyingSchema) {
        underlyingSchema.examples = ['example@email.com'];
      }
    }
  }

  if (schema.hasType('string')) {
    // @ts-ignore
    return h(StringProperty, propsObject);
  }

  if (schema.hasType('boolean')) {
    // @ts-ignore
    return h(BooleanProperty, propsObject);
  }

  if (schema.hasType('number') || schema.hasType('integer')) {
    // @ts-ignore
    return h(NumberProperty, propsObject);
  }

  if (schema.hasType('object') || schema.properties !== undefined) {
    // @ts-ignore
    return h(SimpleObjectProperty, propsObject);
  }

  if (schema.hasType('array')) {
    // @ts-ignore
    return h(SimpleArrayProperty, propsObject);
  }

  if (schema.hasType('null')) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: [null],
    });
  }

  return h('p', `Property ${nodeData.name} with type ${schema.type} is not supported`);
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

function buildProperties(
  nodeData: ConfigTreeNodeData | AddItemTreeNodeData,
  mode: SessionMode,
  schema: JsonSchemaWrapper = nodeData.schema
) {
  return {
    propertyName: nodeData.name,
    propertyData: getDataForMode(mode).dataAt(nodeData.absolutePath),
    propertySchema: schema,
    parentSchema: nodeData.parentSchema,
    relativePath: nodeData.relativePath,
    absolutePath: nodeData.absolutePath,
    validationResults: getValidationForMode(mode).currentValidationResult.value.filterForPath(
      nodeData.absolutePath
    ),
    expanded: getSessionForMode(mode).isExpanded(nodeData.absolutePath),
  };
}
