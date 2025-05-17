import {dataAt} from '@/utility/resolveDataAtPath';
import {pathToJsonPointer} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';
import {findAvailableSchemaId, isSubSchemaDefinedInDefinitions} from '@/schema/schemaReadingUtils';
import type {ManagedData} from '@/data/managedData';
import {constructSchemaGraph} from '@/schema/graph-representation/schemaGraphConstructor';
import type {SchemaNodeData} from '@/schema/graph-representation/schemaGraphTypes';
import {updateReferences} from '@/utility/renameUtils';
import {stringToIdentifier} from '@/utility/stringToIdentifier';

export function extractAllInlinedSchemaElements(
  schemaData: ManagedData,
  extractRootElement: boolean,
  extractEnums: boolean
): number {
  const graph = constructSchemaGraph(schemaData.data.value, false);
  // filter by nodes which are inlined and an object node
  const nodedFiltered = graph.nodes.filter(
    node =>
      !isSubSchemaDefinedInDefinitions(node.absolutePath) &&
      (extractRootElement || node.absolutePath.length > 1) &&
      ((extractEnums && node.getNodeType() == 'schemaenum') || node.getNodeType() == 'schemaobject')
  );

  // sort nodes by path depth, so that we can extract the deepest nodes first, to avoid a node being moved before its children and then not being able to find the children anymore
  const nodesSorted = sortNodesByPathDepthDescending(nodedFiltered);

  let nodesExtracted = 0;

  nodesSorted.forEach(node => {
    const newIdentifier = createIdentifierForExtractedElement(
      node.name,
      node.title,
      node.fallbackDisplayName
    );
    extractInlinedSchemaElement(node.absolutePath, schemaData, newIdentifier);
    nodesExtracted++;
  });

  return nodesExtracted;
}

function sortNodesByPathDepthDescending(nodes: SchemaNodeData[]): SchemaNodeData[] {
  return nodes.sort((a, b) => b.absolutePath.length - a.absolutePath.length);
}

export function extractInlinedSchemaElement(
  absoluteElementPath: Path,
  schemaData: ManagedData,
  elementName: string,
  forgetIfDuplicateExists: boolean = false
): Path {
  const dataAtPath = dataAt(absoluteElementPath, schemaData.data.value);

  const updateDataFct: (path: Path, newValue: any) => void = (path, newValue) => {
    schemaData.setDataAt(path, newValue);
  };

  if (forgetIfDuplicateExists) {
    // if an existing definition exists with the same content, we can just reference that
    const existingElementDefPath = ['$defs', elementName];
    const existingElementDef = dataAt(existingElementDefPath, schemaData.data.value);
    if (existingElementDef) {
      if (JSON.stringify(existingElementDef) === JSON.stringify(dataAtPath)) {
        const referenceToNewElement = '#' + pathToJsonPointer(existingElementDefPath);
        schemaData.setDataAt(absoluteElementPath, {
          $ref: referenceToNewElement,
        });
        updateReferences(
          absoluteElementPath,
          existingElementDefPath,
          schemaData.data.value,
          updateDataFct
        );
        return existingElementDefPath;
      }
    }
  }

  const newElementId = findAvailableSchemaId(schemaData, ['$defs'], elementName, true);
  schemaData.setDataAt(newElementId, dataAtPath);
  const referenceToNewElement = '#' + pathToJsonPointer(newElementId);
  schemaData.setDataAt(absoluteElementPath, {
    $ref: referenceToNewElement,
  });
  updateReferences(absoluteElementPath, newElementId, schemaData.data.value, updateDataFct);
  return newElementId;
}

export function createIdentifierForExtractedElement(
  name: string | undefined,
  title: string | undefined,
  fallbackDisplayName: string
) {
  let identifier = name;
  // if the name is a json schema keyword which has a json schema as a value (except via additionalProperties, where the user then can define the name for their property), then do not use it (e.g. 'items', 'not', 'if', 'then', 'else'), we instead want a more suitable name
  // note that the current implementation here will not catch each of these keywords but only the most common ones
  if (identifier !== undefined && ['items', 'not', 'if', 'then', 'else'].includes(identifier)) {
    identifier = undefined;
  }

  if (identifier === undefined && title !== undefined) {
    identifier = stringToIdentifier(title, false);
  }
  if (identifier === undefined) {
    identifier = stringToIdentifier(fallbackDisplayName, false);
  }
  return identifier;
}

export function addSchemaObject(schemaData: ManagedData) {
  const rawData = schemaData.data.value;

  // set type of root element to object if not done yet
  if (rawData.type !== 'object') {
    rawData.type = 'object';
  }

  const objectPath = findAvailableSchemaId(schemaData, ['$defs'], 'object');
  schemaData.setDataAt(objectPath, {
    type: 'object',
    properties: {
      property1: {
        type: 'string',
      },
    },
  });

  // make connection from root element to new object if root has no properties yet
  if (rawData.properties === undefined) {
    const objectName = objectPath[objectPath.length - 1];
    const referenceToNewObject = '#' + pathToJsonPointer(objectPath);
    schemaData.setDataAt(['properties', objectName], {
      $ref: referenceToNewObject,
    });
  }

  return objectPath;
}

export function addSchemaEnum(schemaData: ManagedData) {
  const enumPath = findAvailableSchemaId(schemaData, ['$defs'], 'enum');
  schemaData.setDataAt(enumPath, {
    type: 'string',
    enum: ['VAL_1', 'VAL_2'],
  });
  return enumPath;
}
