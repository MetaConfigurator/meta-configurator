import type cytoscape from 'cytoscape';
import type * as $rdf from 'rdflib';
import {
  type RdfNodeLiteral,
  RdfTermType,
  predicateAliasMapping,
} from '@/components/panels/rdf/rdfUtils';
import {isTypePredicate} from '@/components/panels/rdf/visualizer/rdfVisualizerGraphStyle';

type NodeLiteralContainer = {
  literals?: RdfNodeLiteral[];
};

export function getPredicateAlias(
  predicate: string,
  toPrefixed: (value: string) => string
): string {
  for (const [alias, uris] of Object.entries(predicateAliasMapping)) {
    if (uris.includes(predicate)) {
      return alias;
    }
  }
  return toPrefixed(predicate);
}

export function countNodes(statements: readonly $rdf.Statement[]): number {
  const nodes = new Set<string>();
  for (const st of statements) {
    nodes.add(st.subject.value);
    if (st.object.termType !== RdfTermType.Literal) {
      nodes.add(st.object.value);
    }
  }
  return nodes.size;
}

export function buildLiteralsForSubject(
  subjectId: string,
  statements: readonly $rdf.Statement[],
  toPrefixed: (value: string) => string,
  isIRI: (value: string) => boolean
): RdfNodeLiteral[] {
  const literals: RdfNodeLiteral[] = [];
  for (const st of statements) {
    if (st.subject.value !== subjectId) continue;
    const predicate = getPredicateAlias(st.predicate.value, toPrefixed);
    if (st.object.termType === RdfTermType.Literal) {
      literals.push({
        predicate,
        value: st.object.value,
        isIRI: isIRI(st.object.value),
        statement: st,
      });
    } else {
      literals.push({
        predicate,
        value: toPrefixed(st.object.value),
        isIRI: true,
        href: st.object.value,
        statement: st,
      });
    }
  }
  return literals;
}

export function buildGraphElements(
  statements: readonly $rdf.Statement[],
  toPrefixed: (value: string) => string,
  isIRI: (value: string) => boolean
): cytoscape.ElementDefinition[] {
  const nodesMap = new Map<string, NodeLiteralContainer>();
  const edges: cytoscape.ElementDefinition[] = [];
  const existingSubjects = new Set<string>(statements.map(st => st.subject.value));

  for (const st of statements) {
    const subject = st.subject.value;
    const predicate = st.predicate.value;
    const object = st.object.value;

    ensureNode(nodesMap, subject);

    if (st.object.termType === RdfTermType.Literal) {
      addLiteral(nodesMap, subject, predicate, object, toPrefixed, isIRI, undefined, st);
      continue;
    }

    addLiteral(nodesMap, subject, predicate, toPrefixed(object), toPrefixed, isIRI, object, st);

    if (isTypePredicate(predicate) || !existingSubjects.has(object)) {
      continue;
    }

    ensureNode(nodesMap, object);
    edges.push(createEdge(subject, predicate, object, toPrefixed));
  }

  const nodes = Array.from(nodesMap.entries()).map(([id, data]) =>
    createNode(id, data, toPrefixed)
  );
  return [...nodes, ...edges];
}

function ensureNode(nodesMap: Map<string, NodeLiteralContainer>, id: string) {
  if (!nodesMap.has(id)) {
    nodesMap.set(id, {literals: []});
  }
}

function addLiteral(
  nodesMap: Map<string, NodeLiteralContainer>,
  subjectId: string,
  predicate: string,
  value: string,
  toPrefixed: (value: string) => string,
  isIRI: (value: string) => boolean,
  href?: string,
  statement?: $rdf.Statement
) {
  nodesMap.get(subjectId)!.literals!.push({
    predicate: getPredicateAlias(predicate, toPrefixed),
    value,
    isIRI: Boolean(href) || isIRI(value),
    href,
    statement,
  });
}

function createEdge(
  source: string,
  predicate: string,
  target: string,
  toPrefixed: (value: string) => string
): cytoscape.ElementDefinition {
  return {
    data: {
      id: `${source}-${predicate}-${target}`,
      source,
      target,
      label: getPredicateAlias(predicate, toPrefixed),
      predicateIRI: predicate,
    },
  };
}

function createNode(
  id: string,
  data: NodeLiteralContainer,
  toPrefixed: (value: string) => string
): cytoscape.ElementDefinition {
  return {
    data: {
      id,
      label: toPrefixed(id),
      hasLiterals: data.literals && data.literals.length > 0,
      literalCount: data.literals?.length || 0,
      literals: data.literals,
    },
  };
}
