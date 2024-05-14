import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';
import {
  EdgeData,
  EdgeType,
  SchemaEnumNodeData,
  SchemaGraph,
  SchemaElementData,
  SchemaObjectAttributeData,
  SchemaObjectNodeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import type {Path} from '@/utility/path';
import {getTypeDescription} from '@/schema/schemaReadingUtils';
import {jsonPointerToPath, pathToString} from '@/utility/pathUtils';
import {mergeAllOfs} from '@/schema/mergeAllOfs';
import {useSettings} from '@/settings/useSettings';

export function constructSchemaGraph(rootSchema: TopLevelSchema): SchemaGraph {
  // copy schema to avoid modifying the original
  rootSchema = JSON.parse(JSON.stringify(rootSchema));

  rootSchema = mergeAllOfs(rootSchema);

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

  const schemaGraph = new SchemaGraph([], []);
  for (const [path, node] of objectDefs.entries()) {
    schemaGraph.nodes.push(node);

    if (isObjectSchema(node.schema)) {
      node.attributes = generateObjectAttributes(node.absolutePath, node.schema, objectDefs);
      generateAttributeEdges(node, objectDefs, schemaGraph);
      generateObjectSpecialPropertyEdges(node, objectDefs, schemaGraph);
    }
  }

  trimGraph(schemaGraph);
  trimChildren(schemaGraph);

  return schemaGraph;
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
      // if we have an object with an if condition, the if itself sometimes does not explicitly state
      // that it is of type object, but it is implicitly an object. For the graph generation to deal with it
      // properly, we inject the type object into the schema.
      injectTypeObjectIntoSchema(schema.if);
      identifyObjects([...currentPath, 'if'], schema.if, defs);
    }
  }
  if (schema.then) {
    if (typeof schema.then === 'object') {
      // if we have an object with an if condition, the if itself sometimes does not explicitly state
      // that it is of type object, but it is implicitly an object. For the graph generation to deal with it
      // properly, we inject the type object into the schema.
      injectTypeObjectIntoSchema(schema.then);
      identifyObjects([...currentPath, 'then'], schema.then, defs);
    }
  }
  if (schema.else) {
    // if we have an object with an if condition, the if itself sometimes does not explicitly state
    // that it is of type object, but it is implicitly an object. For the graph generation to deal with it
    // properly, we inject the type object into the schema.
    injectTypeObjectIntoSchema(schema.else);
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

function injectTypeObjectIntoSchema(schema: JsonSchemaType) {
  if (schema === true || schema === false) {
    return;
  }
  schema.type = 'object';
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
  const attributes: SchemaObjectAttributeData[] = [];
  for (const [attributeName, attributeSchema] of Object.entries(schema.properties || {})) {
    if (typeof attributeSchema === 'object') {
      const required = schema.required ? schema.required.includes(attributeName) : false;
      let typeDescription = generateAttributeTypeDescription(
        [...path, 'properties', attributeName],
        attributeSchema,
        objectDefs
      );
      const attributeData = new SchemaObjectAttributeData(
        attributeName,
        typeDescription,
        [...path, 'properties', attributeName],
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
  objectDefs: Map<string, SchemaObjectNodeData>,
  graph: SchemaGraph
) {
  for (const attribute of node.attributes) {
    let attrSchema = attribute.schema;
    let attributeNode: SchemaObjectNodeData | undefined = undefined;

    if (attrSchema.$ref) {
      const referenceObject = resolveReferenceNode(attrSchema, objectDefs);
      if (referenceObject) {
        attrSchema = referenceObject.schema;
        attributeNode = referenceObject;
      } else {
        console.warn(
          'Unable to find reference node for attribute ' +
            attribute.name +
            ' with path ' +
            pathToString(attribute.absolutePath)
        );
      }
    }

    if (isObjectSchema(attrSchema) || isEnumSchema(attrSchema)) {
      if (!attributeNode) {
        attributeNode = resolveObjectAttributeNode(attribute.absolutePath, attrSchema, objectDefs);
      }
      if (attributeNode) {
        graph.edges.push(new EdgeData(node, attributeNode, EdgeType.ATTRIBUTE, attribute.name));
      }
    } else if (attrSchema.type == 'array') {
      if (!attributeNode) {
        attributeNode = resolveArrayItemNode(attribute.absolutePath, attrSchema, objectDefs);
      }
      if (attributeNode && attributeNode.schema.type == 'object') {
        graph.edges.push(
          new EdgeData(node, attributeNode, EdgeType.ARRAY_ATTRIBUTE, attribute.name)
        );
      }
    }
  }
}

function resolveReferenceNode(
  schema: JsonSchemaType,
  objectDefs: Map<string, SchemaObjectNodeData>
): SchemaObjectNodeData | undefined {
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
  objectDefs: Map<string, SchemaObjectNodeData>
): SchemaObjectNodeData | undefined {
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
  objectDefs: Map<string, SchemaObjectNodeData>
): SchemaObjectNodeData | undefined {
  if (isObjectSchema(schema)) {
    return objectDefs.get(pathToString(path));
  }
  return undefined;
}

export function generateObjectSpecialPropertyEdges(
  node: SchemaObjectNodeData,
  objectDefs: Map<string, SchemaObjectNodeData>,
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
}

function isObjectSchema(schema: JsonSchemaType): boolean {
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

function generateObjectSubSchemasEdge(
  node: SchemaObjectNodeData,
  subSchemas: JsonSchemaType[],
  subSchemasPath: Path,
  edgeType: EdgeType,
  objectDefs: Map<string, SchemaObjectNodeData>,
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
  objectDefs: Map<string, SchemaObjectNodeData>,
  graph: SchemaGraph
) {
  const referenceNode = resolveReferenceNode(subSchema, objectDefs);
  if (referenceNode) {
    graph.edges.push(new EdgeData(node, referenceNode, edgeType, edgeType));
  } else {
    const subSchemaPathString = pathToString(subSchemaPath);
    const subSchemaNode = objectDefs.get(subSchemaPathString);
    if (subSchemaNode) {
      graph.edges.push(new EdgeData(node, subSchemaNode, edgeType, edgeType));
    }
  }
}

export function trimGraph(graph: SchemaGraph) {
  //graph.edges = graph.edges.filter(edge => {
  //    return isNodeRelevantToDisplay(edge.start, graph) && isNodeRelevantToDisplay(edge.end, graph);
  //});

  graph.nodes = graph.nodes.filter(node => {
    return isNodeConnectedByEdge(node, graph);
  });
}

function trimChildren(graph: SchemaGraph) {
  const maxEnumValuesToShow = useSettings().schemaDiagram.maxEnumValuesToShow;
  const maxAttributesToShow = useSettings().schemaDiagram.maxAttributesToShow;
  for (const nodeData of graph.nodes) {
    if (nodeData.getNodeType() == 'schemaobject') {
      const nodeDataObject = nodeData as SchemaObjectNodeData;
      if (nodeDataObject.attributes.length > maxAttributesToShow) {
        nodeDataObject.attributes = nodeDataObject.attributes.slice(0, maxAttributesToShow);
        nodeDataObject.attributes.push(
          new SchemaObjectAttributeData(
            '...',
            '',
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
        nodeDataEnum.values = nodeDataEnum.values.slice(0, maxEnumValuesToShow);
        nodeDataEnum.values.push('...');
      }
    }
  }
}

function isNodeConnectedByEdge(node: SchemaElementData, graph: SchemaGraph): boolean {
  return (
    graph.edges.find(edge => edge.start == node || edge.end == node) !== undefined ||
    node.schema.type == 'object'
  );
}
