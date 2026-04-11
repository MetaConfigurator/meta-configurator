import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {
  defaultQueryTemplate,
  validateSparqlSyntax,
  visualizationQueryTemplate,
} from '@/components/panels/rdf/rdfUtils';
import {RdfTermType} from '@/components/panels/rdf/rdfUtils';
import {RdfMediaType} from '@/components/panels/rdf/rdfEnums';
import * as $rdf from 'rdflib';
import type {Ref} from 'vue';

export enum QueryResultMode {
  CONSTRUCT = 'construct',
  SELECT = 'select',
}

function buildPrefixBlock(namespaces: Record<string, string>): string {
  return Object.entries(namespaces)
    .filter(([prefix]) => prefix !== '@vocab')
    .map(([prefix, iri]) => `PREFIX ${prefix}: <${iri}>`)
    .join('\n');
}

function applyPrefixesToQuery(queryBody: string): string {
  const prefixes = buildPrefixBlock(rdfStoreManager.namespaces.value);
  return prefixes ? `${prefixes}\n\n${queryBody}` : queryBody;
}

const termToString = (term: any) =>
  term?.termType === RdfTermType.Literal ? term.value : term?.value ?? (term ? String(term) : '');

const rdfjsToRdflib = (term: any) => {
  if (!term) return null;
  if (term.termType === RdfTermType.NamedNode) return $rdf.sym(term.value);
  if (term.termType === RdfTermType.BlankNode) return $rdf.blankNode(term.value);
  if (term.termType === RdfTermType.Literal) {
    const langOrDt =
      term.language || (term.datatype?.value ? $rdf.sym(term.datatype.value) : undefined);
    return $rdf.literal(term.value, langOrDt);
  }
  return null;
};

function isValidVisualizationConstruct(query: string): boolean {
  const normalized = query
    .replace(/#[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const constructPattern = /construct\s*\{\s*\?subject\s+\?predicate\s+\?object\s*\.\s*\}/;
  return constructPattern.test(normalized);
}

export function useSparqlRunner(options: {
  enableVisualization: Ref<boolean>;
  enableResult: Ref<boolean>;
  sparqlQuery: Ref<string>;
  results: Ref<Record<string, string>[]>;
  columns: Ref<string[]>;
  statements: Ref<$rdf.Statement[]>;
  errorMessage: Ref<string | null>;
  errorLineNumber: Ref<number | null>;
  activeTab: Ref<string>;
  queryMode: Ref<QueryResultMode>;
  sortColumns: (cols: string[]) => string[];
  initFilters: (cols: string[]) => void;
}) {
  let validateTimer: number | null = null;

  const setEditorText = (text: string, applyPrefixes: boolean = true) => {
    options.sparqlQuery.value = applyPrefixes ? applyPrefixesToQuery(text) : text;
  };

  const initializeEditorQuery = () => {
    setEditorText(defaultQueryTemplate);
  };

  const onVisualizationToggleChanged = (on: boolean) => {
    setEditorText(on ? visualizationQueryTemplate : defaultQueryTemplate);
  };

  const validateCurrentSparqlSyntax = (): boolean => {
    const result = validateSparqlSyntax(options.sparqlQuery.value);
    if (result.valid) return true;

    options.errorMessage.value = result.errorMessage;
    options.errorLineNumber.value = result.errorLine;
    return false;
  };

  const validateLive = () => {
    if (validateTimer) window.clearTimeout(validateTimer);

    validateTimer = window.setTimeout(() => {
      options.errorMessage.value = null;
      options.errorLineNumber.value = null;

      const result = validateSparqlSyntax(options.sparqlQuery.value);
      if (!result.valid) {
        options.errorMessage.value = result.errorMessage;
        options.errorLineNumber.value = result.errorLine;
      }
    }, 250);
  };

  const runConstructQuery = async (engine: any, sources: any[]) => {
    const stmts: $rdf.Statement[] = [];
    const computedColumns = ['?subject', '?predicate', '?object'];

    const finalize = () => {
      const sorted = options.sortColumns(computedColumns);
      options.columns.value = sorted;
      options.initFilters(sorted);

      options.queryMode.value = QueryResultMode.CONSTRUCT;
      options.statements.value = stmts;
      options.activeTab.value = 'visualizer';
    };

    const quadsStream = await engine.queryQuads(options.sparqlQuery.value, {sources});

    quadsStream
      .on('data', (q: any) => {
        options.results.value.push({
          '?subject': termToString(q.subject),
          '?predicate': termToString(q.predicate),
          '?object': termToString(q.object),
        });

        const s = rdfjsToRdflib(q.subject);
        const p = rdfjsToRdflib(q.predicate);
        const o = rdfjsToRdflib(q.object);

        if (
          s &&
          p &&
          o &&
          p.termType === RdfTermType.NamedNode &&
          s.termType !== RdfTermType.Literal
        ) {
          stmts.push(new $rdf.Statement(s as any, p as any, o as any));
        }
      })
      .on('end', finalize)
      .on('error', (e: any) => {
        options.errorMessage.value = String(e?.message ?? e);
        finalize();
      });
  };

  const runSelectQuery = async (engine: any, sources: any[]) => {
    try {
      const bindingsStream = await engine.queryBindings(options.sparqlQuery.value, {sources});
      const rows: Record<string, string>[] = [];

      const computedColumns =
        (await bindingsStream
          .getMetadata?.()
          .then((m: any) =>
            (m?.variables ?? []).map(
              (v: any) => `?${v.value ?? v.name ?? String(v).replace(/^\?/, '')}`
            )
          )
          .catch(() => [])) ?? [];

      const finalize = () => {
        const cols = rows.length ? Object.keys(rows[0]!) : computedColumns;
        const sorted = options.sortColumns(cols);

        options.queryMode.value = QueryResultMode.SELECT;
        options.columns.value = sorted;
        options.initFilters(sorted);
        options.activeTab.value = 'result';
      };

      bindingsStream
        .on('data', (binding: any) => {
          const row = Object.fromEntries(
            [...binding.keys()].map((v: any) => {
              const name = v.value ?? v.name ?? String(v).replace(/^\?/, '');
              return [`?${name}`, termToString(binding.get(v))];
            })
          ) as Record<string, string>;

          rows.push(row);
          options.results.value.push(row);
        })
        .on('end', finalize)
        .on('error', (e: any) => {
          options.errorMessage.value = String(e?.message ?? e);
          finalize();
        });
    } catch (e: any) {
      options.errorMessage.value = String(e?.message ?? e);
    }
  };

  const runQuery = async () => {
    options.results.value = [];
    options.columns.value = [];
    options.statements.value = [];
    options.errorMessage.value = null;
    options.errorLineNumber.value = null;

    if (!validateCurrentSparqlSyntax()) return;

    const engine = new (window as any).Comunica.QueryEngine();
    const {content} = rdfStoreManager.exportAs(RdfMediaType.NTriples);
    const sources = [{type: 'serialized', value: content, mediaType: RdfMediaType.NTriples}];

    if (options.enableVisualization.value) {
      if (!isValidVisualizationConstruct(options.sparqlQuery.value)) {
        options.errorMessage.value =
          'Invalid CONSTRUCT query for visualization. Please ensure the query follows the required structure.';
        return;
      }
      await runConstructQuery(engine, sources);
    } else {
      await runSelectQuery(engine, sources);
    }

    options.enableResult.value = true;
  };

  return {
    setEditorText,
    initializeEditorQuery,
    onVisualizationToggleChanged,
    validateLive,
    runQuery,
  };
}
