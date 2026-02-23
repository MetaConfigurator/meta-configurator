import * as $rdf from 'rdflib';
import type {Path} from '@/utility/path';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';

export interface JsonLdDoc {
  '@context': any;
  '@graph': any[];
}

interface JsonLdNodeManagerStore {
  editStatement: (oldStatement: $rdf.Statement, newStatement: $rdf.Statement) => void;
  deleteStatement: (statement: $rdf.Statement) => void;
  addStatement: (statement: $rdf.Statement, isNewNode: boolean) => void;
  renameSubjectNode: () => void;
  findPath: (statement: $rdf.Statement) => Path | undefined;
  extractJsonLdByPath: (path: Path) => JsonLdDoc | undefined;
}

export const jsonLdNodeManager: JsonLdNodeManagerStore = (() => {
  const data = getDataForMode(SessionMode.DataEditor);

  const editStatement = (_oldStatement: $rdf.Statement, _newStatement: $rdf.Statement) => {
    buildJsonLdFromStore();
  };

  const deleteStatement = (_statement: $rdf.Statement) => {
    buildJsonLdFromStore();
  };

  const addStatement = (_statement: $rdf.Statement, _isNewNode: boolean) => {
    buildJsonLdFromStore();
  };

  const renameSubjectNode = () => {
    buildJsonLdFromStore();
  };

  const findPath = (statement: $rdf.Statement) => {
    const json = data.data.value;
    const context = extractContext(json);
    const subjectEquivs = getEquivalentTerms(statement.subject.value, context);
    const predicateEquivs = getEquivalentTerms(statement.predicate.value, context);
    const objectEquivs = getEquivalentTerms(statement.object.value, context);

    return findPathInJson(json, [], subjectEquivs, predicateEquivs, objectEquivs) as Path;
  };

  function buildJsonLdFromStore() {
    const _jsonData = rdfStoreManager.exportAs('application/ld+json');
    const parsed = JSON.parse(_jsonData.content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (!parsed['@graph']) {
        const graphNode = {...parsed};
        delete graphNode['@context'];
        data.setData({
          '@context': parsed['@context'],
          '@graph': [graphNode],
        });
        return;
      }
    }
    data.setData(parsed);
  }

  function extractContext(json: any): Record<string, any> {
    if (!json || typeof json !== 'object') return {};
    const ctx = json['@context'];
    if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
      return ctx;
    }
    return {};
  }

  function compactTerm(fullIri: string, context: Record<string, any>): string | null {
    if (!fullIri || typeof fullIri !== 'string') return null;
    for (const prefix in context) {
      const base = context[prefix];
      if (typeof base === 'string' && fullIri.startsWith(base)) {
        return `${prefix}:${fullIri.slice(base.length)}`;
      }
    }
    return null;
  }

  function getEquivalentTerms(term: string, context: Record<string, any>): Set<string> {
    const out = new Set<string>();
    out.add(term);
    const compact = compactTerm(term, context);
    if (compact) out.add(compact);
    return out;
  }

  function findPathInJson(
    value: any,
    path: (string | number)[],
    subjectEquivs: Set<string>,
    predicateEquivs: Set<string>,
    objectEquivs: Set<string>
  ): (string | number)[] | null {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const found = findPathInJson(
          value[i],
          [...path, i],
          subjectEquivs,
          predicateEquivs,
          objectEquivs
        );
        if (found) return found;
      }
      return null;
    }

    if (!value || typeof value !== 'object') return null;

    if (typeof value['@id'] === 'string' && subjectEquivs.has(value['@id'])) {
      const inNode = findPathInNode(value, path, predicateEquivs, objectEquivs);
      if (inNode) return inNode;
    }

    for (const key of Object.keys(value)) {
      const found = findPathInJson(
        value[key],
        [...path, key],
        subjectEquivs,
        predicateEquivs,
        objectEquivs
      );
      if (found) return found;
    }

    return null;
  }

  function findPathInNode(
    node: Record<string, any>,
    nodePath: (string | number)[],
    predicateEquivs: Set<string>,
    objectEquivs: Set<string>
  ): (string | number)[] | null {
    for (const key of Object.keys(node)) {
      if (!predicateEquivs.has(key)) continue;
      const match = matchObjectValue(node[key], [...nodePath, key], objectEquivs);
      if (match) return match;
    }
    return null;
  }

  function matchObjectValue(
    value: any,
    basePath: (string | number)[],
    objectEquivs: Set<string>
  ): (string | number)[] | null {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const found = matchObjectValue(value[i], [...basePath, i], objectEquivs);
        if (found) return found;
      }
      return null;
    }

    if (value && typeof value === 'object') {
      if (typeof value['@id'] === 'string' && objectEquivs.has(value['@id'])) {
        return [...basePath, '@id'];
      }
      if ('@value' in value && objectEquivs.has(String(value['@value']))) {
        return [...basePath, '@value'];
      }
      return null;
    }

    const normalized = String(value);
    if (objectEquivs.has(normalized)) return basePath;

    return null;
  }

  function extractJsonLdByPath(jsonld: any, path: Path): JsonLdDoc | undefined {
    const hasGraph = Boolean(jsonld && typeof jsonld === 'object' && jsonld['@graph']);
    const graphPath = hasGraph ? path : (['@graph', 0, ...path] as Path);
    if (graphPath.length < 3 || graphPath[0] !== '@graph') {
      return undefined;
    }

    const [, graphIndex, predicate, object] = graphPath;
    if (typeof graphIndex !== 'number' || typeof predicate !== 'string') {
      return undefined;
    }

    const subjectNode = hasGraph ? jsonld['@graph']?.[graphIndex] : jsonld;
    if (!subjectNode) {
      return undefined;
    }

    let value = subjectNode[predicate];
    if (value === undefined) {
      return undefined;
    }
    if (object !== undefined && typeof object === 'number') {
      value = value[object];
    }

    const subjectId =
      typeof subjectNode === 'string' ? subjectNode : subjectNode['@id'] ?? jsonld?.['@id'];

    return {
      '@context': jsonld?.['@context'],
      '@graph': [
        {
          '@id': subjectId,
          [predicate]: value,
        },
      ],
    };
  }

  return {
    editStatement,
    deleteStatement,
    addStatement,
    renameSubjectNode,
    findPath,
    extractJsonLdByPath: (path: Path) => extractJsonLdByPath(data.data.value, path),
  };
})();
