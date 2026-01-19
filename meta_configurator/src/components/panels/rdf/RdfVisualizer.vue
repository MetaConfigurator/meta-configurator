<template>
  <div ref="container" style="height: 500px; border: 1px solid #ccc"></div>
</template>

<script setup lang="ts">
import {ref, watch, onMounted, type Ref} from 'vue';
import {Network} from 'vis-network';
import type * as $rdf from 'rdflib';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {PREDICATE_ALIAS_MAP} from '@/components/panels/rdf/jsonLdParser';

const container = ref<HTMLDivElement | null>(null);
let network: Network | null = null;

function getPredicateAlias(predicate: string): string {
  for (const [alias, uris] of Object.entries(PREDICATE_ALIAS_MAP)) {
    if (uris.includes(predicate)) {
      return alias;
    } else {
      return toPrefixed(predicate);
    }
  }
  return predicate;
}

function toPrefixed(iri: string): string {
  for (const [prefix, ns] of Object.entries(rdfStoreManager.namespaces.value)) {
    if (iri.startsWith(ns)) {
      return `${prefix}:${iri.slice(ns.length)}`;
    }
  }
  return iri;
}

function renderGraph(statements: readonly $rdf.Statement[]) {
  const nodes = new Map<string, any>();
  const edges: any[] = [];

  for (const st of statements) {
    const s = st.subject.value;
    const p = st.predicate.value;
    const o = st.object.value;

    nodes.set(s, {
      id: s,
      label: toPrefixed(s),
      shape: 'box',
    });

    if (st.object.termType === 'Literal') {
      nodes.set(o, {
        id: o,
        label: o,
        shape: 'diamond',
        color: '#FFD700',
      });
    } else {
      nodes.set(o, {
        id: o,
        label: toPrefixed(o),
        shape: 'box',
      });
    }

    edges.push({
      from: s,
      to: o,
      label: getPredicateAlias(p),
      arrows: 'to',
      length: 150,
    });
  }

  const data = {
    nodes: Array.from(nodes.values()),
    edges,
  };

  if (!network && container.value) {
    network = new Network(container.value, data, {
      physics: false,
      edges: {font: {align: 'middle'}},
      nodes: {
        font: {multi: true},
        margin: 15,
      },
    });
  } else {
    network!.setData(data);
  }
}

onMounted(() => {
  renderGraph(rdfStoreManager.statements.value);
});

watch(
  () => [rdfStoreManager.statements.value, rdfStoreManager.namespaces.value],
  () => {
    renderGraph(rdfStoreManager.statements.value);
  },
  {deep: false}
);
</script>
