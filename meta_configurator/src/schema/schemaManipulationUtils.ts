import {dataAt} from '@/utility/resolveDataAtPath';
import {pathToJsonPointer} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';
import {findAvailableSchemaId, isSubSchemaDefinedInDefinitions} from '@/schema/schemaReadingUtils';
import type {ManagedData} from '@/data/managedData';
import {constructSchemaGraph} from '@/schema/graph-representation/schemaGraphConstructor';
import type {SchemaNodeData} from '@/schema/graph-representation/schemaGraphTypes';
import {updateReferences} from '@/utility/renameUtils';
import {stringToIdentifier} from '@/utility/stringToIdentifier';
import {collectAllRefs, resolveInternalReferencePath} from '@/schema/schemaReferenceUtils';
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
export function postProcessSchemaModification(
  responseObject: any,
  schemaData: ManagedData,
  bundledDefinitionNames: string[] = []
): any {
  if (responseObject === null || typeof responseObject !== 'object') {
    return responseObject;
  }
  const response = extractGeneratedDefinitionsFromSubSchema(
    responseObject,
    schemaData,
    bundledDefinitionNames
  );
  // if response is a object which contains a $schema property, remove this property, as it is not allowed in sub-schemas
  if (response && typeof response === 'object' && '$schema' in response) {
    delete response.$schema;
  }
  return response;
}
export function extractGeneratedDefinitionsFromSubSchema(
  subSchema: any,
  rootSchemaData: ManagedData,
  bundledDefinitionNames: string[] = []
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

  const pathMappings: {oldLocalPath: Path; newRootPath: Path; content: any; wasBundled: boolean}[] =
    [];
  for (const {defsKey, name, content} of localDefinitions) {
    // bundled definitions already exist in the root schema and keep their original path,
    // new definitions get a free path (or are collapsed into an identical existing one)
    const wasBundled = bundledDefinitionNames.includes(name);
    const newRootPath: Path = wasBundled
      ? [defsKey, name]
      : (doesIdenticalSchemaDefinitionExist(rootSchemaData, content) ??
        findAvailableSchemaId(rootSchemaData, ['$defs'], name, true));
    pathMappings.push({oldLocalPath: [defsKey, name], newRootPath, content, wasBundled});
  }

  const rewriteTargets: any[] = [subSchema, ...pathMappings.map(m => m.content)];
  for (const {oldLocalPath, newRootPath} of pathMappings) {
    for (const target of rewriteTargets) {
      updateReferences(oldLocalPath, newRootPath, target, (path, newValue) => {
        _.set(target, path, newValue);
      });
    }
  }

  for (const {newRootPath, content, wasBundled} of pathMappings) {
    // bundled definitions are written back unconditionally so that AI modifications
    // to them take effect in the root schema
    if (wasBundled || rootSchemaData.dataAt(newRootPath) === undefined) {
      rootSchemaData.setDataAt(newRootPath, content);
    }
  }

  return subSchema;
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

/**
 * Copies all root schema definitions that the given sub-schema references (directly or
 * transitively) into a clone of the sub-schema, so it can be understood standalone,
 * e.g. by an AI that only sees the sub-schema. The counterpart
 * extractGeneratedDefinitionsFromSubSchema moves the definitions back to the root
 * afterwards; the returned bundledDefinitionNames tell it which definitions existed
 * before and therefore may be overwritten at their original location.
 */
export function bundleReferencedDefinitions(
  subSchema: any,
  rootSchemaRaw: any
): {bundledSubSchema: any; bundledDefinitionNames: string[]} {
  if (subSchema === null || typeof subSchema !== 'object') {
    return {bundledSubSchema: subSchema, bundledDefinitionNames: []};
  }

  const bundledSubSchema = _.cloneDeep(subSchema);
  const bundledDefinitionNames: string[] = [];

  const pendingRefs = collectAllRefs(bundledSubSchema);
  const visitedRefs = new Set<string>();
  while (pendingRefs.length > 0) {
    const ref = pendingRefs.shift()!;
    if (visitedRefs.has(ref)) {
      continue;
    }
    visitedRefs.add(ref);

    const refPath = resolveInternalReferencePath(ref);
    if (refPath === undefined || refPath.length < 2) {
      continue;
    }
    // a ref pointing into a definition (however deep) requires bundling the whole definition
    const defsKey = String(refPath[0]);
    const definitionName = String(refPath[1]);
    if (defsKey !== '$defs' && defsKey !== 'definitions') {
      continue;
    }

    const definition = dataAt([defsKey, definitionName], rootSchemaRaw);
    if (definition === undefined || bundledSubSchema[defsKey]?.[definitionName] !== undefined) {
      continue;
    }

    if (bundledSubSchema[defsKey] === undefined) {
      bundledSubSchema[defsKey] = {};
    }
    bundledSubSchema[defsKey][definitionName] = _.cloneDeep(definition);
    bundledDefinitionNames.push(definitionName);
    // definitions can reference other definitions, which then need to be bundled as well
    pendingRefs.push(...collectAllRefs(definition));
  }
  return {bundledSubSchema, bundledDefinitionNames};
}
