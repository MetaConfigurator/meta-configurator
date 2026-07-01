import {dataAt} from '@/utility/resolveDataAtPath';
import {pathToJsonPointer} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';
import {findAvailableSchemaId, isSubSchemaDefinedInDefinitions} from '@/schema/schemaReadingUtils';
import type {ManagedData} from '@/data/managedData';
import {constructSchemaGraph} from '@/schema/graph-representation/schemaGraphConstructor';
import type {SchemaNodeData} from '@/schema/graph-representation/schemaGraphTypes';
import {updateReferences} from '@/utility/renameUtils';
import {stringToIdentifier} from '@/utility/stringToIdentifier';
import _ from 'lodash';

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
    extractInlinedSchemaElement(node.absolutePath, schemaData, newIdentifier, true);
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
    // if an equivalent definition already exists anywhere in $defs (not just at the
    // candidate name), reference that one instead of creating a duplicate. This collapses
    // identical sub-schemas
    const existingDefPath = doesIdenticalSchemaDefinitionExist(schemaData, dataAtPath);
    if (existingDefPath) {
      const referenceToExistingElement = '#' + pathToJsonPointer(existingDefPath);
      schemaData.setDataAt(absoluteElementPath, {
        $ref: referenceToExistingElement,
      });
      updateReferences(absoluteElementPath, existingDefPath, schemaData.data.value, updateDataFct);
      return existingDefPath;
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

/**
 * Looks through every entry in the schema's top-level $defs and (legacy) definitions
 * sections and returns the path of the first one whose content is deeply equal to
 * `schemaToCheck`. Returns undefined if no such definition exists.
 *
 * Used to avoid creating duplicate definition entries when extracting sub-schemas: if an
 * equivalent definition is already there, the caller can reference it instead.
 */
export function doesIdenticalSchemaDefinitionExist(
  schemaData: ManagedData,
  schemaToCheck: any
): Path | undefined {
  for (const defsKey of ['$defs', 'definitions']) {
    const defs = dataAt([defsKey], schemaData.data.value);
    if (!defs || typeof defs !== 'object') {
      continue;
    }
    for (const name of Object.keys(defs)) {
      if (_.isEqual(defs[name], schemaToCheck)) {
        return [defsKey, name];
      }
    }
  }
  return undefined;
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

export function extractGeneratedDefinitionsFromSubSchema(
  subSchema: any,
  schemaData: ManagedData
): any {
  if (subSchema === null || typeof subSchema !== 'object' || Array.isArray(subSchema)) {
    return subSchema;
  }

  const localDefinitions: {defsKey: string; name: string; content: any}[] = [];
  for (const defsKey of ['$defs', 'definitions']) {
    const localDefs = subSchema[defsKey];
    if (localDefs === undefined || localDefs === null || typeof localDefs !== 'object') {
      continue;
    }
    delete subSchema[defsKey];
    for (const definitionName of Object.keys(localDefs)) {
      localDefinitions.push({defsKey, name: definitionName, content: localDefs[definitionName]});
    }
  }

  if (localDefinitions.length === 0) {
    return subSchema;
  }

  const pathMappings: {oldLocalPath: Path; newRootPath: Path; content: any}[] = [];
  for (const {defsKey, name, content} of localDefinitions) {
    let newRootPath = doesIdenticalSchemaDefinitionExist(schemaData, content);
    if (newRootPath === undefined) {
      newRootPath = findAvailableSchemaId(schemaData, ['$defs'], name, true);
    }
    pathMappings.push({oldLocalPath: [defsKey, name], newRootPath, content});
  }

  const rewriteTargets: any[] = [subSchema, ...pathMappings.map(m => m.content)];
  for (const {oldLocalPath, newRootPath} of pathMappings) {
    for (const target of rewriteTargets) {
      updateReferences(oldLocalPath, newRootPath, target, (path, newValue) => {
        setValueAtPath(target, path, newValue);
      });
    }
  }

  for (const {newRootPath, content} of pathMappings) {
    if (schemaData.dataAt(newRootPath) === undefined) {
      schemaData.setDataAt(newRootPath, content);
    }
  }

  return subSchema;
}

function setValueAtPath(root: any, path: Path, value: any): void {
  if (path.length === 0) return;
  let current = root;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]!];
  }
  current[path[path.length - 1]!] = value;
}

export function addSchemaObject(
  schemaData: ManagedData,
  connectWithRootIfRootEmpty: boolean = true,
  schema: any = undefined,
  identifier: string | undefined = undefined
) {
  const rawData = schemaData.data.value;

  // set type of root element to object if not done yet
  if (rawData.type !== 'object') {
    rawData.type = 'object';
  }

  let objectPath: Path;
  if (identifier !== undefined) {
    objectPath = findAvailableSchemaId(schemaData, ['$defs'], identifier, true);
  } else {
    objectPath = findAvailableSchemaId(schemaData, ['$defs'], 'object');
  }

  if (schema !== undefined) {
    schemaData.setDataAt(objectPath, schema);
  } else {
    schemaData.setDataAt(objectPath, {
      type: 'object',
      properties: {
        property1: {
          type: 'string',
        },
      },
    });
  }

  // make connection from root element to new object if root has no properties yet
  if (connectWithRootIfRootEmpty && rawData.properties === undefined) {
    const objectName = objectPath[objectPath.length - 1]!;
    const referenceToNewObject = '#' + pathToJsonPointer(objectPath);
    schemaData.setDataAt(['properties', objectName], {
      $ref: referenceToNewObject,
    });
  }

  return objectPath;
}

export function addSchemaEnum(
  schemaData: ManagedData,
  schema: any = undefined,
  identifier: string | undefined = undefined
) {
  let enumPath: Path;

  if (identifier !== undefined) {
    enumPath = findAvailableSchemaId(schemaData, ['$defs'], identifier, true);
  } else {
    enumPath = findAvailableSchemaId(schemaData, ['$defs'], 'enum');
  }

  if (schema !== undefined) {
    schemaData.setDataAt(enumPath, schema);
  } else {
    schemaData.setDataAt(enumPath, {
      type: 'string',
      enum: ['VAL_1', 'VAL_2'],
    });
  }
  return enumPath;
}
