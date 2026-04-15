import * as $rdf from 'rdflib';
import type {Path} from '@/utility/path';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';
import {RdfMediaType} from '@/components/panels/rdf/rdfEnums';

export interface JsonLdDoc {
  '@context': any;
  '@graph': any[];
}

export interface JsonLdNodeManagerStore {
  editStatement: (oldStatement: $rdf.Statement, newStatement: $rdf.Statement) => void;
  deleteStatement: (statement: $rdf.Statement) => void;
  addStatement: (statement: $rdf.Statement, isNewNode: boolean) => void;
  renameSubjectNode: () => void;
  findPath: (statement: $rdf.Statement) => Path | undefined;
  extractJsonLdByPath: (path: Path) => JsonLdDoc | undefined;
}

interface TripleEquivs {
  subject: Set<string>;
  predicate: Set<string>;
  object: Set<string>;
}

type JsonPath = (string | number)[];

export const jsonLdNodeManager: JsonLdNodeManagerStore = (() => {
  const data = getDataForMode(SessionMode.DataEditor);

  const rebuildFromStore = (): void => {
    const {content} = rdfStoreManager.exportAs(RdfMediaType.JsonLd);
    const parsed = JSON.parse(content);
    data.setData(normalizeJsonLdRoot(parsed));
  };

  const editStatement = (_old: $rdf.Statement, _new: $rdf.Statement) => rebuildFromStore();
  const deleteStatement = (_statement: $rdf.Statement) => rebuildFromStore();
  const addStatement = (_statement: $rdf.Statement, _isNew: boolean) => rebuildFromStore();
  const renameSubjectNode = () => rebuildFromStore();

  const findPath = (statement: $rdf.Statement): Path | undefined => {
    const json = data.data.value;
    const equivs: TripleEquivs = {
      subject: jsonLdContextManager.getEquivalentTerms(statement.subject.value),
      predicate: jsonLdContextManager.getEquivalentTerms(statement.predicate.value),
      object: jsonLdContextManager.getEquivalentTerms(statement.object.value),
    };
    return findPathInJson(json, [], equivs) as Path;
  };

  const extractJsonLdByPath = (path: Path): JsonLdDoc | undefined =>
    extractFromJsonLd(data.data.value, path);

  return {
    editStatement,
    deleteStatement,
    addStatement,
    renameSubjectNode,
    findPath,
    extractJsonLdByPath,
  };
})();

function normalizeJsonLdRoot(parsed: any): any {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed['@graph']) {
    return parsed;
  }
  const {'@context': context, ...graphNode} = parsed;
  return {'@context': context, '@graph': [graphNode]};
}

function findPathInJson(value: any, path: JsonPath, equivs: TripleEquivs): JsonPath | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = findPathInJson(value[i], [...path, i], equivs);
      if (found) return found;
    }
    return null;
  }

  if (!value || typeof value !== 'object') return null;

  if (typeof value['@id'] === 'string' && equivs.subject.has(value['@id'])) {
    const match = findPathInNode(value, path, equivs);
    if (match) return match;
  }

  for (const key of Object.keys(value)) {
    const found = findPathInJson(value[key], [...path, key], equivs);
    if (found) return found;
  }

  return null;
}

function findPathInNode(
  node: Record<string, any>,
  nodePath: JsonPath,
  equivs: TripleEquivs
): JsonPath | null {
  for (const key of Object.keys(node)) {
    if (!equivs.predicate.has(key)) continue;
    const match = matchObjectValue(node[key], [...nodePath, key], equivs.object);
    if (match) return match;
  }
  return null;
}

function matchObjectValue(
  value: any,
  basePath: JsonPath,
  objectEquivs: Set<string>
): JsonPath | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = matchObjectValue(value[i], [...basePath, i], objectEquivs);
      if (found) return found;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    if (typeof value['@id'] === 'string' && objectEquivs.has(value['@id']))
      return [...basePath, '@id'];
    if ('@value' in value && objectEquivs.has(String(value['@value'])))
      return [...basePath, '@value'];
    return null;
  }

  return objectEquivs.has(String(value)) ? basePath : null;
}

function extractFromJsonLd(jsonld: any, path: Path): JsonLdDoc | undefined {
  const hasGraph = Boolean(jsonld?.['@graph']);
  const graphPath = hasGraph ? path : (['@graph', 0, ...path] as Path);

  if (graphPath.length < 3 || graphPath[0] !== '@graph') return undefined;

  const [, graphIndex, predicate, objectIndex] = graphPath;
  if (typeof graphIndex !== 'number' || typeof predicate !== 'string') return undefined;

  const subjectNode = hasGraph ? jsonld['@graph']?.[graphIndex] : jsonld;
  if (!subjectNode) return undefined;

  let value = subjectNode[predicate];
  if (value === undefined) return undefined;
  if (typeof objectIndex === 'number') value = value[objectIndex];

  const subjectId =
    typeof subjectNode === 'string' ? subjectNode : subjectNode['@id'] ?? jsonld?.['@id'];

  return {
    '@context': jsonld?.['@context'],
    '@graph': [{'@id': subjectId, [predicate]: value}],
  };
}
