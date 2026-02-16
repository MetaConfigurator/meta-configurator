import * as $rdf from 'rdflib';
import type {NamedNode, BlankNode, Literal} from 'rdflib';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {RdfTermType, type RdfTermTypeString} from '@/components/panels/rdf/rdfUtils';

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

export class TripleEditorService {
  private static expandDatatype(value: string): string {
    if (!value) return value;
    if (value.includes('://') || value.startsWith('urn:')) return value;
    const idx = value.indexOf(':');
    if (idx > 0) {
      const prefix = value.slice(0, idx);
      const suffix = value.slice(idx + 1);
      const ns = rdfStoreManager.namespaces.value[prefix];
      if (ns) return ns + suffix;
      if (prefix === 'xsd') return `http://www.w3.org/2001/XMLSchema#${suffix}`;
    }
    return value;
  }

  private static createNode(
    value: string,
    type: RdfTermTypeString,
    datatype?: string | null
  ): NamedNode | BlankNode | Literal {
    switch (type) {
      case RdfTermType.NamedNode:
        return $rdf.sym(value);
      case RdfTermType.Literal:
        if (datatype) {
          const expanded = this.expandDatatype(datatype);
          return $rdf.literal(value, $rdf.sym(expanded));
        }
        return $rdf.literal(value);
      case RdfTermType.BlankNode:
        return $rdf.blankNode();
      default:
        throw new Error(`Unknown term type: ${type}`);
    }
  }

  static addOrEdit(dto: TripleTransferObject): TripleEditorResult {
    const subjectNode = this.createNode(dto.subject, dto.subjectType);
    if (subjectNode.termType === RdfTermType.Literal) {
      return {success: false, errorMessage: 'Subject cannot be a Literal.'};
    }
    const predicateNode = this.createNode(dto.predicate, dto.predicateType);
    if (predicateNode.termType === RdfTermType.Literal) {
      return {success: false, errorMessage: 'Predicate cannot be a Literal.'};
    }
    const objectNode = this.createNode(dto.object, dto.objectType, dto.objectDatatype);

    const newStatement = $rdf.st(
      subjectNode as NamedNode | BlankNode,
      predicateNode as NamedNode,
      objectNode
    );

    const isNewNode = false;
    if (!dto.statement) {
      const response = rdfStoreManager.addStatement(newStatement, isNewNode);
      if (!response.success) return response;

      jsonLdNodeManager.addStatement(newStatement, isNewNode);
      return {success: true};
    }

    const response = rdfStoreManager.editStatement(dto.statement, newStatement);
    if (!response.success) return response;

    jsonLdNodeManager.editStatement(dto.statement, newStatement);
    return {success: true};
  }

  static delete(statement: $rdf.Statement): TripleEditorResult {
    rdfStoreManager.deleteStatement(statement);
    jsonLdNodeManager.deleteStatement(statement);
    return {success: true};
  }
}
