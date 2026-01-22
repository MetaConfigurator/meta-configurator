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
  findPath: (statement: $rdf.Statement) => Path | undefined;
}

export const jsonLdNodeManager: JsonLdNodeManagerStore = (() => {
  const data = getDataForMode(SessionMode.DataEditor);
  const parser = ref<JsonLdParser | null>(null);

  const editStatement = (oldStatement: $rdf.Statement, newStatement: $rdf.Statement) => {
    // parser.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));
    // let path = parser.value!.findPath(statement) as Path;
    // if (path) {
    //   data.setDataAt()
    // }
  };

  const deleteStatement = (statement: $rdf.Statement) => {
    parser.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));

    const path = parser.value.findPath(statement) as Path;
    const hasSubject = rdfStoreManager.containsSubject(statement);
    const hasPredicate = rdfStoreManager.containsPredicate(statement);

    if (!hasSubject) {
      data.removeDataAt(path.slice(0, 2));
      return;
    }

    if (!hasPredicate) {
      data.removeDataAt(path.at(-1) === '@value' ? path.slice(0, -1) : path);
      return;
    }

    const objectValue = rdfStoreManager.getObject(statement);
    data.setDataAt(path.slice(0, -1), objectValue);
  };

  const addStatement = (statement: $rdf.Statement, isNewNode: boolean) => {
    parser.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));
    if (isNewNode) {
      let jsonObject = JSON.parse(rdfStoreManager.statementAsJsonLd(statement)!);
      for (const [prefix, iri] of Object.entries(jsonObject['@context'])) {
        if (prefix.startsWith('@')) continue;
        if (!rdfStoreManager.namespaces.value[prefix]) {
          data.setDataAt(['@context', prefix], iri);
        }
      }
      delete jsonObject['@context'];
      data.setDataAt(['@graph', data.dataAt(['@graph']).length], jsonObject);
    } else {
    }
  };

  const findPath = (statement: $rdf.Statement) => {
    parser.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));
    return parser.value.findPath(statement) as Path;
  };

  return {
    editStatement,
    deleteStatement,
    addStatement,
    findPath,
  };
})();
