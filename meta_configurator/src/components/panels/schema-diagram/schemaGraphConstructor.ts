import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';
import {
  EdgeData,
  EdgeType,
  SchemaEnumNodeData,
  SchemaGraph,
  SchemaElementData,
  SchemaObjectAttributeData,
  SchemaObjectNodeData,
  SchemaNodeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import type {Path} from '@/utility/path';
import {getTypeDescription} from '@/schema/schemaReadingUtils';
import {jsonPointerToPath, pathToString} from '@/utility/pathUtils';
import {useSettings} from '@/settings/useSettings';
import {mergeAllOfs} from '@/schema/mergeAllOfs';

export function constructSchemaGraph(rootSchema: TopLevelSchema): SchemaGraph {
  if (useSettings().schemaDiagram.mergeAllOfs) {
    // duplicate root schema to avoid modifying the original schema
    rootSchema = JSON.parse(JSON.stringify(rootSchema));

    // merge allOfs
    rootSchema = mergeAllOfs(rootSchema);
  }

  const objectDefs = identifyAllObjects(rootSchema);

  const schemaGraph = new SchemaGraph([], []);
  populateGraph(objectDefs, schemaGraph);

  trimGraph(schemaGraph);
  trimNodeChildren(schemaGraph);

  return schemaGraph;
}

export function populateGraph(
  objectDefs: Map<string, SchemaObjectNodeData>,
  schemaGraph: SchemaGraph
) {
  for (const [path, node] of objectDefs.entries()) {
    schemaGraph.nodes.push(node);

    if (isObjectSchema(node.schema)) {
      node.attributes = generateObjectAttributes(node.absolutePath, node.schema, objectDefs);
      generateAttributeEdges(node, objectDefs, schemaGraph);
      generateObjectSpecialPropertyEdges(node, objectDefs, schemaGraph);
    }
  }
}

export function identifyAllObjects(rootSchema: TopLevelSchema): Map<string, SchemaObjectNodeData> {
  const objectDefs = new Map<string, SchemaObjectNodeData>();
  identifyObjects([], rootSchema, objectDefs);

  if (rootSchema.$defs) {
    for (const [key, value] of Object.entries(rootSchema.$defs)) {
      identifyObjects(['$defs', key], value, objectDefs);
    }
  }
  if (rootSchema.definitions) {
    for (const [key, value] of Object.entries(rootSchema.definitions)) {
      identifyObjects(['definitions', key], value, objectDefs);
    }
  }

  return objectDefs;
}

export function identifyObjects(
  currentPath: Path,
  schema: JsonSchemaType,
  defs: Map<string, SchemaElementData>
) {
  if (schema === true || schema === false) {
    return;
  }

  // It can be that simple types, such as strings with enum constraint, have their own definition.
  // We allow generating a node for this, so it can be referred to by other objects.
  // But we do not visualize those nodes for simple types.
  //if (schema.type == 'object' || schema.title) {
  defs.set(pathToString(currentPath), generateInitialNode(currentPath, schema));
  //}

  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      if (typeof value === 'object') {
        const childPath = [...currentPath, 'properties', key];
        identifyObjects(childPath, value, defs);
      }
    }
  }
  if (schema.patternProperties) {
    for (const [key, value] of Object.entries(schema.patternProperties)) {
      if (typeof value === 'object') {
        const childPath = [...currentPath, 'patternProperties', key];
        identifyObjects(childPath, value, defs);
      }
    }
  }
  if (schema.items) {
    if (typeof schema.items === 'object') {
      const childPath = [...currentPath, 'items'];
      identifyObjects(childPath, schema.items, defs);
    }
  }

  if (schema.oneOf) {
    for (const [index, value] of schema.oneOf.entries()) {
      if (typeof value === 'object') {
        const childPath = [...currentPath, 'oneOf', index];
        identifyObjects(childPath, value, defs);
      }
    }
  }
  if (schema.anyOf) {
    for (const [index, value] of schema.anyOf.entries()) {
      if (typeof value === 'object') {
        const childPath = [...currentPath, 'anyOf', index];
        identifyObjects(childPath, value, defs);
      }
    }
  }
  if (schema.allOf) {
    for (const [index, value] of schema.allOf.entries()) {
      if (typeof value === 'object') {
        const childPath = [...currentPath, 'allOf', index];
        identifyObjects(childPath, value, defs);
      }
    }
  }
  if (schema.if) {
    if (typeof schema.if === 'object') {
      identifyObjects([...currentPath, 'if'], schema.if, defs);
    }
  }
  if (schema.then) {
    if (typeof schema.then === 'object') {
      identifyObjects([...currentPath, 'then'], schema.then, defs);
    }
  }
  if (schema.else) {
    if (typeof schema.else === 'object') {
      identifyObjects([...currentPath, 'else'], schema.else, defs);
    }
  }
  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'object') {
      identifyObjects([...currentPath, 'additionalProperties'], schema.additionalProperties, defs);
    }
  }
}

function generateInitialNode(path: Path, schema: JsonSchemaObjectType): SchemaElementData {
  if (!isEnumSchema(schema)) {
    return new SchemaObjectNodeData(generateObjectTitle(path, schema), path, schema, []);
  } else {
    return new SchemaEnumNodeData(
      generateObjectTitle(path, schema),
      path,
      schema,
      generateEnumValues(schema)
    );
  }
}

export function generateObjectTitle(path: Path, schema?: JsonSchemaObjectType): string {
  if (schema && schema.title) {
    return schema.title;
  }
  if (path.length == 0) {
    return 'root';
  }
  const lastElement = path[path.length - 1];
  if (typeof lastElement === 'string') {
    return lastElement;
  }
  if (path.length >= 2) {
    const titleOfParent = generateObjectTitle(path.slice(0, path.length - 1));
    return titleOfParent + '[' + lastElement + ']';
  } else {
    return 'element[' + lastElement + ']';
  }
}

export function generateObjectAttributes(
  path: Path,
  schema: JsonSchemaObjectType,
  objectDefs: Map<string, SchemaObjectNodeData>
): SchemaObjectAttributeData[] {
  return [
    ...generateObjectAttributesForType(path, schema, objectDefs, 'properties'),
    ...generateObjectAttributesForType(path, schema, objectDefs, 'patternProperties'),
  ];
}
function generateObjectAttributesForType(
  path: Path,
  schema: JsonSchemaObjectType,
  objectDefs: Map<string, SchemaObjectNodeData>,
  propertiesType: 'properties' | 'patternProperties'
): SchemaObjectAttributeData[] {
  const attributes: SchemaObjectAttributeData[] = [];
  for (const [attributeName, attributeSchema] of Object.entries(schema[propertiesType] || {})) {
    if (typeof attributeSchema === 'object') {
      const required = schema.required ? schema.required.includes(attributeName) : false;
      let typeDescription = generateAttributeTypeDescription(
        [...path, propertiesType, attributeName],
        attributeSchema,
        objectDefs
      );
      const attributeData = new SchemaObjectAttributeData(
        attributeName,
        typeDescription,
        propertiesType,
        [...path, propertiesType, attributeName],
        attributeSchema.deprecated ? attributeSchema.deprecated : false,
        required,
        attributeSchema
      );
      attributes.push(attributeData);
    }
  }
  return attributes;
}

function generateEnumValues(schema: JsonSchemaObjectType): string[] {
  if (schema.enum) {
    // @ts-ignore
    return schema.enum.map(value => value.toString());
  }
  if (schema.const) {
    return [schema.const.toString()];
  }
  return [];
}

export function generateAttributeTypeDescription(
  path: Path,
  schema: JsonSchemaObjectType,
  objectDefs: Map<string, SchemaObjectNodeData>
): string {
  // use regular type description, which is good for simple types
  let typeDescription = getTypeDescription(schema);

  // if data type has a reference, overwrite with the object behind the reference
  const referenceObject = resolveReferenceNode(schema, objectDefs);
  if (referenceObject) {
    typeDescription = referenceObject.name;
  }

  // if data type is an array, overwrite with the type of the array items
  if (schema.type == 'array' && schema.items) {
    const arrayItemObject = resolveArrayItemNode(path, schema, objectDefs);
    if (arrayItemObject) {
      if (arrayItemObject.schema.title) {
        typeDescription = arrayItemObject.name + '[]';
      } else {
        typeDescription = getTypeDescription(arrayItemObject.schema) + '[]';
      }
    } else {
      if (isObjectSchema(schema.items)) {
        typeDescription = getTypeDescription(schema.items as JsonSchemaObjectType) + '[]';
      }
    }
  }

  // if data type is an object, overwrite with actual name of the object definition
  if (isObjectSchema(schema)) {
    const attributeNode = resolveObjectAttributeNode(path, schema, objectDefs);
    if (attributeNode) {
      typeDescription = attributeNode.name;
    }
  }

  return typeDescription;
}

export function generateAttributeEdges(
  node: SchemaObjectNodeData,
  objectDefs: Map<string, SchemaNodeData>,
  graph: SchemaGraph
) {
  for (const attributeData of node.attributes) {
    const [edgeTargetNode, isArray] = resolveEdgeTarget(
      node,
      attributeData.schema,
      attributeData.absolutePath,
      objectDefs
    );
    if (edgeTargetNode) {
      graph.edges.push(
        new EdgeData(node, edgeTargetNode, EdgeType.ATTRIBUTE, isArray, attributeData.name)
      );
    }
  }
}

function resolveEdgeTarget(
  node: SchemaObjectNodeData,
  subSchema: JsonSchemaType,
  subSchemaPath: Path,
  objectDefs: Map<string, SchemaNodeData>
): [SchemaNodeData | undefined, boolean] {
  if (subSchema === true || subSchema === false) {
    return [undefined, false];
  }

  let edgeTargetNode: SchemaNodeData | undefined = undefined;

  if (subSchema.$ref) {
    const referenceObject = resolveReferenceNode(subSchema, objectDefs);
    if (referenceObject) {
      subSchema = referenceObject.schema;
      edgeTargetNode = referenceObject;
    } else {
      console.warn(
        'Unable to find reference node for attribute ' + ' with path ' + pathToString(subSchemaPath)
      );
    }
  }

  if (isSchemaThatDeservesANode(subSchema)) {
    if (!edgeTargetNode) {
      edgeTargetNode = resolveObjectAttributeNode(subSchemaPath, subSchema, objectDefs);
    }
    if (edgeTargetNode) {
      return [edgeTargetNode, false];
    }
  } else if (subSchema.type == 'array') {
    const pathToResolveArrayItem = edgeTargetNode ? edgeTargetNode.absolutePath : subSchemaPath;
    edgeTargetNode = resolveArrayItemNode(pathToResolveArrayItem, subSchema, objectDefs);
    if (edgeTargetNode && isSchemaThatDeservesANode(edgeTargetNode.schema)) {
      return [edgeTargetNode, true];
    }
  }

  return [undefined, false];
}

function resolveReferenceNode(
  schema: JsonSchemaType,
  objectDefs: Map<string, SchemaNodeData>
): SchemaNodeData | undefined {
  if (schema == false || schema == true) {
    return undefined;
  }
  if (schema.$ref) {
    const refPath = jsonPointerToPath(schema.$ref.replace('#', ''));
    const refPathString = pathToString(refPath);
    if (objectDefs.has(refPathString)) {
      return objectDefs.get(refPathString);
    }
  }
  return undefined;
}

function resolveArrayItemNode(
  path: Path,
  schema: JsonSchemaObjectType,
  objectDefs: Map<string, SchemaNodeData>
): SchemaNodeData | undefined {
  if (schema.type == 'array' && schema.items) {
    if (typeof schema.items == 'object') {
      let itemObjectPath = [...path, 'items'];
      const referenceObject = resolveReferenceNode(schema.items, objectDefs);
      if (referenceObject) {
        itemObjectPath = referenceObject.absolutePath;
      }
      return objectDefs.get(pathToString(itemObjectPath));
    }
  }
  return undefined;
}

function resolveObjectAttributeNode(
  path: Path,
  schema: JsonSchemaObjectType,
  objectDefs: Map<string, SchemaNodeData>
): SchemaNodeData | undefined {
  if (isSchemaThatDeservesANode(schema)) {
    return objectDefs.get(pathToString(path));
  }
  return undefined;
}

export function generateObjectSpecialPropertyEdges(
  node: SchemaObjectNodeData,
  objectDefs: Map<string, SchemaNodeData>,
  graph: SchemaGraph
) {
  const schema = node.schema;
  if (schema.oneOf) {
    generateObjectSubSchemasEdge(
      node,
      schema.oneOf,
      [...node.absolutePath, 'oneOf'],
      EdgeType.ONE_OF,
      objectDefs,
      graph
    );
  }
  if (schema.anyOf) {
    generateObjectSubSchemasEdge(
      node,
      schema.anyOf,
      [...node.absolutePath, 'anyOf'],
      EdgeType.ANY_OF,
      objectDefs,
      graph
    );
  }
  if (schema.allOf) {
    generateObjectSubSchemasEdge(
      node,
      schema.allOf,
      [...node.absolutePath, 'allOf'],
      EdgeType.ALL_OF,
      objectDefs,
      graph
    );
  }
  if (schema.if) {
    generateObjectSubSchemaEdge(
      node,
      schema.if,
      [...node.absolutePath, 'if'],
      EdgeType.IF,
      objectDefs,
      graph
    );
  }
  if (schema.then) {
    generateObjectSubSchemaEdge(
      node,
      schema.then,
      [...node.absolutePath, 'then'],
      EdgeType.THEN,
      objectDefs,
      graph
    );
  }
  if (schema.else) {
    generateObjectSubSchemaEdge(
      node,
      schema.else,
      [...node.absolutePath, 'else'],
      EdgeType.ELSE,
      objectDefs,
      graph
    );
  }
  if (schema.additionalProperties) {
    generateObjectSubSchemaEdge(
      node,
      schema.additionalProperties,
      [...node.absolutePath, 'additionalProperties'],
      EdgeType.ADDITIONAL_PROPERTIES,
      objectDefs,
      graph
    );
  }
  if (schema.patternProperties) {
    generateObjectSubSchemaEdge(
      node,
      schema.patternProperties,
      [...node.absolutePath, 'patternProperties'],
      EdgeType.PATTERN_PROPERTIES,
      objectDefs,
      graph
    );
  }
}

export function isSchemaThatDeservesANode(schema: JsonSchemaType): boolean {
  return isObjectSchema(schema) || isEnumSchema(schema);
}

export function isObjectSchema(schema: JsonSchemaType): boolean {
  if (schema === true || schema === false) {
    return false;
  }
  if (schema.type == 'object') {
    return true;
  }
  // check if schema.type itself is a list of types, that contains the 'object' string
  if (Array.isArray(schema.type)) {
    return schema.type.includes('object');
  }

  if (isConditionalSchema(schema) || isCompositionalSchema(schema)) {
    return true;
  }

  if (schema.type === undefined) {
    return schema.properties !== undefined;
  }

  return false;
}

function isEnumSchema(schema: JsonSchemaType): boolean {
  if (schema === true || schema === false) {
    return false;
  }
  if (schema.enum || schema.const) {
    return true;
  }
  return false;
}

function isCompositionalSchema(schema: JsonSchemaType): boolean {
  if (schema === true || schema === false) {
    return false;
  }
  if (schema.oneOf || schema.anyOf || schema.allOf) {
    return true;
  }
  return false;
}

function isConditionalSchema(schema: JsonSchemaType): boolean {
  if (schema === true || schema === false) {
    return false;
  }
  if (schema.if && schema.then) {
    return true;
  }
  return false;
}

function generateObjectSubSchemasEdge(
  node: SchemaObjectNodeData,
  subSchemas: JsonSchemaType[],
  subSchemasPath: Path,
  edgeType: EdgeType,
  objectDefs: Map<string, SchemaNodeData>,
  graph: SchemaGraph
) {
  for (const [index, subSchema] of subSchemas.entries()) {
    const subSchemaPath = [...subSchemasPath, index];
    if (typeof subSchema === 'object') {
      generateObjectSubSchemaEdge(node, subSchema, subSchemaPath, edgeType, objectDefs, graph);
    }
  }
}

function generateObjectSubSchemaEdge(
  node: SchemaObjectNodeData,
  subSchema: JsonSchemaType,
  subSchemaPath: Path,
  edgeType: EdgeType,
  objectDefs: Map<string, SchemaNodeData>,
  graph: SchemaGraph
) {
  const [edgeTargetNode, isArray] = resolveEdgeTarget(node, subSchema, subSchemaPath, objectDefs);
  if (edgeTargetNode) {
    graph.edges.push(
      new EdgeData(node, edgeTargetNode, edgeType, isArray, edgeType + (isArray ? ' to array' : ''))
    );
  }
}

export function trimGraph(graph: SchemaGraph) {
  //graph.edges = graph.edges.filter(edge => {
  //    return isNodeRelevantToDisplay(edge.start, graph) && isNodeRelevantToDisplay(edge.end, graph);
  //});

  graph.nodes = graph.nodes.filter(node => {
    return isNodeConnectedByEdge(node, graph) || node.schema.type == 'object';
  });
}

export function trimNodeChildren(graph: SchemaGraph) {
  const maxEnumValuesToShow = useSettings().schemaDiagram.maxEnumValuesToShow;
  const maxAttributesToShow = useSettings().schemaDiagram.maxAttributesToShow;
  for (const nodeData of graph.nodes) {
    if (nodeData.getNodeType() == 'schemaobject') {
      const nodeDataObject = nodeData as SchemaObjectNodeData;
      if (nodeDataObject.attributes.length > maxAttributesToShow) {
        nodeDataObject.attributes = nodeDataObject.attributes.slice(0, maxAttributesToShow - 1);
        nodeDataObject.attributes.push(
          new SchemaObjectAttributeData(
            '...',
            '',
            'properties',
            [...nodeDataObject.absolutePath, 'properties'],
            false,
            false,
            {}
          )
        );
      }
    } else if (nodeData.getNodeType() == 'schemaenum') {
      const nodeDataEnum = nodeData as SchemaEnumNodeData;
      if (nodeDataEnum.values.length > maxEnumValuesToShow) {
        nodeDataEnum.values = nodeDataEnum.values.slice(0, maxEnumValuesToShow - 1);
        nodeDataEnum.values.push('...');
      }
    }
  }
}

function isNodeConnectedByEdge(node: SchemaElementData, graph: SchemaGraph): boolean {
  return graph.edges.find(edge => edge.start == node || edge.end == node) !== undefined;
}
