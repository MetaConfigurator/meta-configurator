import {computed, type Ref} from 'vue';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {downloadFile} from '@/components/panels/rdf/rdfUtils';
import {RdfMediaType} from '@/components/panels/rdf/rdfEnums';
import {QueryResultMode} from '@/components/panels/rdf/sparql-editor/useSparqlRunner';
import type * as $rdf from 'rdflib';

function serializeAsCsv(results: Record<string, string>[], columns: string[]) {
  if (!results.length || !columns.length) return '';

  const escapeCell = (value: string) => {
    if (value.includes('"')) value = value.replace(/"/g, '""');
    if (/[",\n\r]/.test(value)) return `"${value}"`;
    return value;
  };

  const rows = [
    columns.join(','),
    ...results.map(row => columns.map(col => escapeCell(String(row[col] ?? ''))).join(',')),
  ];

  return rows.join('\n');
}

export function useSparqlExport(options: {
  queryMode: Ref<QueryResultMode>;
  results: Ref<Record<string, string>[]>;
  columns: Ref<string[]>;
  statements: Ref<$rdf.Statement[]>;
}) {
  function exportAs(format: string) {
    const serialized = rdfStoreManager.exportAs(format, options.statements.value);
    downloadFile(serialized.content, format);
  }

  function exportAsCsv() {
    const serialized = serializeAsCsv(options.results.value, options.columns.value);
    downloadFile(serialized, 'text/csv');
  }

  const exportOnConstruct = [
    {
      label: 'Turtle',
      icon: 'pi pi-file',
      command: () => exportAs(RdfMediaType.Turtle),
    },
    {
      label: 'N-Triples',
      icon: 'pi pi-file',
      command: () => exportAs(RdfMediaType.NTriples),
    },
    {
      label: 'RDF/XML',
      icon: 'pi pi-file',
      command: () => exportAs(RdfMediaType.RdfXml),
    },
  ];

  const exportOnSelect = [
    {
      label: 'CSV',
      icon: 'pi pi-file',
      command: () => exportAsCsv(),
    },
  ];

  const exportMenuItems = computed(() =>
    options.queryMode.value === QueryResultMode.CONSTRUCT ? exportOnConstruct : exportOnSelect
  );

  return {
    exportMenuItems,
  };
}
