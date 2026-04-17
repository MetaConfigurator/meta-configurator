import * as $rdf from 'rdflib';
import type {NamedNode, BlankNode, Literal} from 'rdflib';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {RdfTermType, type RdfTermTypeString, XSD_NS} from '@/components/panels/rdf/rdfUtils';

export interface TripleTransferObject {
  subject: string;
  subjectType: RdfTermTypeString;
  predicate: string;
  predicateType: RdfTermTypeString;
  object: string;
  objectType: RdfTermTypeString;
  objectDatatype?: string | null;
  statement?: $rdf.Statement;
}

export interface TripleEditorResult {
  success: boolean;
  errorMessage?: string;
}

const OK: TripleEditorResult = {success: true};

export class TripleEditorService {
  static addOrEdit(dto: TripleTransferObject): TripleEditorResult {
    const subjectNode = createNode(dto.subject, dto.subjectType);

    const predicateNode = createNode(dto.predicate, dto.predicateType);
    if (predicateNode.termType !== RdfTermType.NamedNode)
      return {success: false, errorMessage: 'Predicate must be a Named Node.'};

    const objectNode = createNode(dto.object, dto.objectType, dto.objectDatatype);
    const newStatement = $rdf.st(
      subjectNode as NamedNode | BlankNode,
      predicateNode as NamedNode,
      objectNode
    );

    return dto.statement ? this.edit(dto.statement, newStatement) : this.add(newStatement);
  }

  static delete(statement: $rdf.Statement): TripleEditorResult {
    rdfStoreManager.deleteStatement(statement);
    jsonLdNodeManager.deleteStatement(statement);
    return OK;
  }

  static renameSubjectNode(oldId: string, newId: string): TripleEditorResult {
    const result = rdfStoreManager.renameSubjectNode(oldId, newId);
    if (!result.success) return result;

    jsonLdNodeManager.renameSubjectNode();
    return OK;
  }

  private static add(statement: $rdf.Statement): TripleEditorResult {
    const result = rdfStoreManager.addStatement(statement, false);
    if (!result.success) return result;
    jsonLdNodeManager.addStatement(statement, false);
    return OK;
  }

  private static edit(old: $rdf.Statement, next: $rdf.Statement): TripleEditorResult {
    const result = rdfStoreManager.editStatement(old, next);
    if (!result.success) return result;
    jsonLdNodeManager.editStatement(old, next);
    return OK;
  }
}

function expandDatatype(value: string): string {
  if (!value || value.includes('://') || value.startsWith('urn:')) return value;

  const idx = value.indexOf(':');
  if (idx <= 0) return value;

  const prefix = value.slice(0, idx);
  const suffix = value.slice(idx + 1);
  const ns = rdfStoreManager.namespaces.value[prefix];

  return ns ? ns + suffix : prefix === 'xsd' ? `${XSD_NS}${suffix}` : value;
}

function createNode(
  value: string,
  type: RdfTermTypeString,
  datatype?: string | null
): NamedNode | BlankNode | Literal {
  switch (type) {
    case RdfTermType.NamedNode:
      return $rdf.sym(value);
    case RdfTermType.BlankNode:
      return $rdf.blankNode(normalizeBlankNodeId(value));
    case RdfTermType.Literal:
      return datatype
        ? $rdf.literal(value, $rdf.sym(expandDatatype(datatype)))
        : $rdf.literal(value);
    default:
      throw new Error(`Unknown term type: ${type}`);
  }
}

function normalizeBlankNodeId(value: string): string | undefined {
  if (!value) return undefined;
  return value.startsWith('_:') ? value.slice(2) : value;
}
