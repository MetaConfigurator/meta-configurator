import {ref} from 'vue';
import * as $rdf from 'rdflib';
import type {Path} from '@/utility/path';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {JsonLdParser} from '@/components/panels/rdf/jsonLdParser';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';

interface JsonLdNodeManagerStore {
  editStatement: (oldStatement: $rdf.Statement, newStatement: $rdf.Statement) => void;
  deleteStatement: (statement: $rdf.Statement) => void;
  addStatement: (statement: $rdf.Statement, isNewNode: boolean) => void;
  renameSubjectNode: () => void;
  findPath: (statement: $rdf.Statement) => Path | undefined;
}

export const jsonLdNodeManager: JsonLdNodeManagerStore = (() => {
  const data = getDataForMode(SessionMode.DataEditor);
  const parser = ref<JsonLdParser | null>(null);

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
    parser.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));
    return parser.value.findPath(statement) as Path;
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

  return {
    editStatement,
    deleteStatement,
    addStatement,
    renameSubjectNode,
    findPath,
  };
})();
