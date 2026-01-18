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
      data.removeDataAt(path.slice(0, -1));
      return;
    }

    if (!hasPredicate) {
      data.removeDataAt(path.at(-1) === '@value' ? path.slice(0, -1) : path);
      return;
    }

    const objectValue = rdfStoreManager.getObject(statement);
    data.setDataAt(path.slice(0, -1), objectValue);
  };

  const removeContext = (jsonLdText: string): Record<string, any> => {
    const obj = JSON.parse(jsonLdText);
    delete obj['@context'];
    return obj;
  };

  const addStatement = (statement: $rdf.Statement, isNewNode: boolean) => {
    parser.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));
    let newNode = rdfStoreManager.statementAsJsonLd(statement);
    if (isNewNode) {
      console.log(newNode);
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
