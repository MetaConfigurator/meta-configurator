/**
 * Makes a sub-schema self-contained by inlining the root definitions it references, and
 * puts such a sub-schema back into the root schema afterwards, restoring the definitions.
 * The AI prompts panel is the current caller, since an LLM only sees the sub-schema it is
 * given, but nothing here is specific to that use.
 */
import _ from 'lodash';
import type {ManagedData} from '@/data/managedData';
import type {Path} from '@/utility/path';
import {dataAt} from '@/utility/resolveDataAtPath';
import {updateReferences} from '@/utility/renameUtils';
import {findAvailableSchemaId} from '@/schema/schemaReadingUtils';
import {doesIdenticalSchemaDefinitionExist} from '@/schema/schemaManipulationUtils';
import {collectAllRefs, resolveInternalReferencePath} from '@/schema/schemaReferenceUtils';

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
      : doesIdenticalSchemaDefinitionExist(rootSchemaData, content) ??
        findAvailableSchemaId(rootSchemaData, ['$defs'], name, true);
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
    // bundled definitions are written back unconditionally so that modifications
    // to them take effect in the root schema
    if (wasBundled || rootSchemaData.dataAt(newRootPath) === undefined) {
      rootSchemaData.setDataAt(newRootPath, content);
    }
  }

  return subSchema;
}

/**
 * Copies all root schema definitions that the given sub-schema references (directly or
 * transitively) into a clone of the sub-schema, so it can be understood standalone,
 * e.g. by a consumer that only receives the sub-schema. The counterpart
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
