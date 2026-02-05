import {ref} from 'vue';
import * as $rdf from 'rdflib';
import type {Path} from '@/utility/path';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {JsonLdParser} from '@/components/panels/rdf/jsonLdParser';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {useSettings} from '@/settings/useSettings';
import {RdfTermType} from '@/components/panels/rdf/rdfUtils';

const settings = useSettings();

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
    if (settings.value.rdf.preserveFormatting) {
      return;
    } else {
      rebuildTextData();
    }
  };

  const deleteStatement = (statement: $rdf.Statement) => {
    if (!settings.value.rdf.preserveFormatting) {
      rebuildTextData();
      return;
    }

    parser.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));

    const path = parser.value.findPath(statement) as Path;
    const hasSubject = rdfStoreManager.containsSubject(statement);
    const hasPredicate = rdfStoreManager.containsPredicate(statement);

    const popTrailingZero = (p: any[]) => (p.at(-1) === 0 ? p.slice(0, -1) : p);
    const dropLast = (p: any[]) => p.slice(0, -1);
    const dropIfLast = (p: any[], key: string) => (p.at(-1) === key ? dropLast(p) : p);

    if (!hasSubject) {
      data.removeDataAt(path.slice(0, 2));
      return;
    }

    if (!hasPredicate) {
      const last = path.at(-1);
      const base = last === '@value' || last === '@id' ? dropLast(path) : path;
      data.removeDataAt(popTrailingZero(base));
      return;
    }

    const objectValue = rdfStoreManager.getObject(statement);
    const base = dropLast(path);

    if (statement.object.termType === RdfTermType.NamedNode) {
      data.removeDataAt(dropIfLast(base, '@id'));
    } else {
      data.setDataAt(base, objectValue);
    }
  };

  const addStatement = (statement: $rdf.Statement, isNewNode: boolean) => {
    if (settings.value.rdf.preserveFormatting) {
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
    } else {
      rebuildTextData();
    }
  };

  const findPath = (statement: $rdf.Statement) => {
    parser.value = new JsonLdParser(JSON.stringify(data.data.value, null, 2));
    return parser.value.findPath(statement) as Path;
  };

  function rebuildTextData() {
    const _jsonData = rdfStoreManager.exportAs('application/ld+json');
    data.setData(JSON.parse(_jsonData.content));
  }

  return {
    editStatement,
    deleteStatement,
    addStatement,
    findPath,
  };
})();
