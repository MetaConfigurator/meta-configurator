import {describe, expect, it, vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EventEmitter} from 'node:events';
import {ref} from 'vue';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(dirname, 'fixtures');

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf-8');
}

type QueryRow = {subject: string; predicate: string; object: any};
let mockQueryRows: QueryRow[] = [];

class MockBindingsStream extends EventEmitter {
  private readonly rows: QueryRow[];

  constructor(rows: QueryRow[]) {
    super();
    this.rows = rows;
  }

  emitRows() {
    const subjectVar = {value: 'subject'};
    const predicateVar = {value: 'predicate'};
    const objectVar = {value: 'object'};

    for (const row of this.rows) {
      const values = new Map<any, any>([
        [subjectVar, {termType: 'NamedNode', value: row.subject}],
        [predicateVar, {termType: 'NamedNode', value: row.predicate}],
        [objectVar, row.object],
      ]);

      const binding = {
        keys: () => [subjectVar, predicateVar, objectVar],
        get: (key: any) => values.get(key),
      };

      this.emit('data', binding);
    }

    this.emit('end');
  }
}

class MockQueryEngine {
  async queryBindings(_query: string, _options: {sources: Array<{value: string}>}) {
    const stream = new MockBindingsStream(mockQueryRows);
    setTimeout(() => stream.emitRows(), 0);
    return stream;
  }
}

async function waitUntil(predicate: () => boolean, timeoutMs = 2500) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out while waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

describe('useSparqlRunner + useSparqlExport', () => {
  it('loads JSON-LD via rdfStoreManager, runs query, and exports query result as CSV', async () => {
    vi.resetModules();
    (globalThis as any).window = globalThis as any;

    const dataRef = ref<any>({});
    const downloadFileMock = vi.fn();

    vi.doMock('@/data/useDataLink', () => ({
      getDataForMode: () => ({
        data: dataRef,
        shallowDataRef: dataRef,
        setData: (value: any) => {
          dataRef.value = value;
        },
      }),
    }));

    vi.doMock('@/components/panels/rdf/rdfUtils', async () => {
      const actual = await vi.importActual<any>('@/components/panels/rdf/rdfUtils');
      return {
        ...actual,
        downloadFile: downloadFileMock,
      };
    });
    vi.doMock('rdflib', async () => {
      const {createRequire} = await import('node:module');
      const require = createRequire(import.meta.url);
      return require('rdflib');
    });

    (window as any).Comunica = {QueryEngine: MockQueryEngine};

    const {rdfStoreManager} = await import('@/components/panels/rdf/rdfStoreManager');
    const {useSparqlRunner, QueryResultMode} = await import(
      '@/components/panels/rdf/sparql-editor/useSparqlRunner'
    );
    const {useSparqlExport} = await import('@/components/panels/rdf/sparql-editor/useSparqlExport');

    const inputJsonLd = JSON.parse(readFixture('input.jsonld'));
    const query = readFixture('query.sparql').trim();
    const expectedCsv = readFixture('expected.csv').trim();

    dataRef.value = inputJsonLd;
    await waitUntil(() => rdfStoreManager.statements.value.length > 0);
    mockQueryRows = (rdfStoreManager.statements.value as any[])
      .map(st => ({
        subject: String(st?.subject?.value ?? ''),
        predicate: String(st?.predicate?.value ?? ''),
        object:
          st?.object?.termType === 'NamedNode'
            ? {termType: 'NamedNode', value: String(st.object.value ?? '')}
            : {
                termType: 'Literal',
                value: String(st?.object?.value ?? ''),
                language: String(st?.object?.language ?? ''),
              },
      }))
      .sort((a, b) => {
        if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
        if (a.predicate !== b.predicate) return a.predicate.localeCompare(b.predicate);
        const aObject = String(a.object?.value ?? '');
        const bObject = String(b.object?.value ?? '');
        return aObject.localeCompare(bObject);
      });

    const enableVisualization = ref(false);
    const enableResult = ref(false);
    const sparqlQuery = ref(query);
    const results = ref<Record<string, string>[]>([]);
    const columns = ref<string[]>([]);
    const statements = ref<any[]>([]);
    const errorMessage = ref<string | null>(null);
    const errorLineNumber = ref<number | null>(null);
    const activeTab = ref('query');
    const queryMode = ref(QueryResultMode.SELECT);

    const runner = useSparqlRunner({
      enableVisualization,
      enableResult,
      sparqlQuery,
      results,
      columns,
      statements,
      errorMessage,
      errorLineNumber,
      activeTab,
      queryMode,
      sortColumns: cols => cols,
      initFilters: () => {},
    });

    await runner.runQuery();
    await waitUntil(() => results.value.length > 0 || errorMessage.value !== null);

    expect(errorMessage.value).toBeNull();

    const {exportMenuItems} = useSparqlExport({
      queryMode,
      results,
      columns,
      statements,
    });

    const csvAction = exportMenuItems.value.find(item => item.label === 'CSV');
    expect(csvAction).toBeDefined();
    csvAction!.command();

    expect(downloadFileMock).toHaveBeenCalledTimes(1);
    const [actualCsv, mime] = downloadFileMock.mock.calls[0]!;
    expect(mime).toBe('text/csv');
    expect(String(actualCsv).trim()).toBe(expectedCsv);
  });
});
