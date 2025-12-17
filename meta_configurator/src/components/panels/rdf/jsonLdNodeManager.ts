import {ref} from 'vue';
import * as $rdf from 'rdflib';
import type {Path} from '@/utility/path';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {JsonLdParser} from '@/components/panels/rdf/jsonLdParser';

interface JsonLdNodeManagerStore {
  deleteStatement: (statement: $rdf.Statement) => Path | undefined;
  addStatement: (statement: $rdf.Statement) => Path | undefined;
  findPath: (statement: $rdf.Statement) => Path | undefined;
}

export const jsonLdNodeManager: JsonLdNodeManagerStore = (() => {
  const data = getDataForMode(SessionMode.DataEditor);
  const _nodeManager = ref<JsonLdParser | null>(null);

  const deleteStatement = (statement: $rdf.Statement) => {
    _nodeManager.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));
    let path = _nodeManager.value!.findPath(statement) as Path;
    if (path) {
      data.removeDataAt(path);
    }
    return path;
  };

  const addStatement = (statement: $rdf.Statement) => {
    _nodeManager.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));
    return _nodeManager.value.findPath(statement) as Path;
  };

  const findPath = (statement: $rdf.Statement) => {
    _nodeManager.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));
    return _nodeManager.value.findPath(statement) as Path;
  };

  return {
    deleteStatement,
    addStatement,
    findPath,
  };
})();
