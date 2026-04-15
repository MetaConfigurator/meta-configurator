<template>
  <Tabs v-model:value="internalActiveTab" class="ontology-tabs">
    <TabList>
      <Tab
        v-for="tab in ontologyTabItems"
        :key="tab.value"
        :value="tab.value"
        :disabled="!isTabEnabled(tab.value)">
        {{ tab.label }}
      </Tab>
      <slot name="extra-tabs" />
    </TabList>
    <TabPanels>
      <TabPanel v-for="tab in ontologyTabItems" :key="tab.value" :value="tab.value">
        <div class="table-search mb-2">
          <InputText
            v-model.trim="tableSearch"
            :placeholder="tab.searchPlaceholder"
            class="w-full" />
        </div>
        <DataTable
          :ref="(el: any) => setTableRef(tab.value, el)"
          :value="filteredRowsByType[tab.value]"
          :first="firstByType[tab.value]"
          @update:first="(value: number) => onFirstChange(tab.value, value)"
          :selection="selectedRowsByType[tab.value]"
          @update:selection="(value: OntologyRow | null) => onSelectionChange(tab.value, value)"
          selectionMode="single"
          dataKey="about"
          size="small"
          stripedRows
          paginator
          :rows="rowsPerPage"
          scrollable
          resizableColumns
          scrollHeight="flex">
          <Column selectionMode="single" headerStyle="width: 3rem" />
          <Column field="about" header="rdf:about">
            <template #body="{data}">
              <a
                class="ontology-term-link"
                :href="buildOntologyTermHref(data.about)"
                target="_blank"
                rel="noopener noreferrer">
                {{ termNameFromIri(data.about) }}
              </a>
            </template>
          </Column>
          <Column field="comment" header="Comment">
            <template #body="{data}">
              <div class="wrapped-comment">{{ data.comment }}</div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>
      <slot name="extra-panels" />
    </TabPanels>
  </Tabs>
</template>

<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from 'vue';
import InputText from 'primevue/inputtext';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import {OntologySourceField, RdfPropertyType} from '@/components/panels/rdf/rdfEnums';
import {normalizeIri} from './rdfOntologyUtils';

export type OntologyPropertyType = `${RdfPropertyType}`;
type ActiveTab = OntologyPropertyType | string;

type OntologyRow = {
  about: string;
  comment: string;
  propertyType: OntologyPropertyType;
};

type TabSpec = {
  value: OntologyPropertyType;
  label: string;
  searchPlaceholder: string;
};

const props = withDefaults(
  defineProps<{
    modelValue: ActiveTab;
    rows: OntologyRow[];
    sourceField: OntologySourceField;
    selectedPrefix: string | null;
    prefixNamespaces: Record<string, string>;
    initialIri?: string;
    rowsPerPage?: number;
  }>(),
  {
    initialIri: '',
    rowsPerPage: 100,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: ActiveTab): void;
  (e: 'preview-iri', value: string): void;
}>();

const ontologyTabItems: TabSpec[] = [
  {
    value: RdfPropertyType.DatatypeProperty,
    label: RdfPropertyType.DatatypeProperty,
    searchPlaceholder: 'Search properties',
  },
  {
    value: RdfPropertyType.ObjectProperty,
    label: RdfPropertyType.ObjectProperty,
    searchPlaceholder: 'Search properties',
  },
  {value: RdfPropertyType.Class, label: RdfPropertyType.Class, searchPlaceholder: 'Search classes'},
];

const internalActiveTab = ref<ActiveTab>(props.modelValue);
const tableSearch = ref('');
const selectedRowsByType = reactive<Record<OntologyPropertyType, OntologyRow | null>>({
  [RdfPropertyType.DatatypeProperty]: null,
  [RdfPropertyType.ObjectProperty]: null,
  [RdfPropertyType.Class]: null,
});
const firstByType = reactive<Record<OntologyPropertyType, number>>({
  [RdfPropertyType.DatatypeProperty]: 0,
  [RdfPropertyType.ObjectProperty]: 0,
  [RdfPropertyType.Class]: 0,
});
const tableRefsByType = reactive<Record<OntologyPropertyType, any | null>>({
  [RdfPropertyType.DatatypeProperty]: null,
  [RdfPropertyType.ObjectProperty]: null,
  [RdfPropertyType.Class]: null,
});

const isPredicateMode = computed(() => props.sourceField === OntologySourceField.Predicate);
const rowsByType = computed<Record<OntologyPropertyType, OntologyRow[]>>(() => ({
  [RdfPropertyType.DatatypeProperty]: props.rows.filter(
    row => row.propertyType === RdfPropertyType.DatatypeProperty
  ),
  [RdfPropertyType.ObjectProperty]: props.rows.filter(
    row => row.propertyType === RdfPropertyType.ObjectProperty
  ),
  [RdfPropertyType.Class]: props.rows.filter(row => row.propertyType === RdfPropertyType.Class),
}));
const filteredRowsByType = computed<Record<OntologyPropertyType, OntologyRow[]>>(() => ({
  [RdfPropertyType.DatatypeProperty]: filterRows(
    rowsByType.value[RdfPropertyType.DatatypeProperty],
    tableSearch.value
  ),
  [RdfPropertyType.ObjectProperty]: filterRows(
    rowsByType.value[RdfPropertyType.ObjectProperty],
    tableSearch.value
  ),
  [RdfPropertyType.Class]: filterRows(rowsByType.value[RdfPropertyType.Class], tableSearch.value),
}));

const selectedRowIri = computed(() => {
  if (!isOntologyPropertyType(internalActiveTab.value)) return '';
  const row = selectedRowsByType[internalActiveTab.value];
  if (!row?.about) return '';

  const namespace = props.selectedPrefix ? props.prefixNamespaces[props.selectedPrefix] ?? '' : '';
  if (!namespace) return row.about;
  if (row.about.startsWith(namespace)) return row.about;
  return `${namespace}${termNameFromIri(row.about)}`;
});

watch(
  () => props.modelValue,
  value => {
    if (value !== internalActiveTab.value) {
      internalActiveTab.value = value;
    }
  }
);

watch(internalActiveTab, value => {
  emit('update:modelValue', value);
  emit('preview-iri', selectedRowIri.value);
});

watch(selectedRowIri, value => {
  emit('preview-iri', value);
});

watch(
  () => props.sourceField,
  sourceField => {
    internalActiveTab.value =
      sourceField === OntologySourceField.Object
        ? RdfPropertyType.Class
        : RdfPropertyType.ObjectProperty;
    clearSelections();
    emit('preview-iri', '');
  },
  {immediate: true}
);

watch(
  () => props.selectedPrefix,
  () => {
    tableSearch.value = '';
    clearSelections();
    resetPaging();
    emit('preview-iri', '');
  }
);

watch(
  () => tableSearch.value,
  () => {
    resetPaging();
  }
);

watch(
  [() => props.rows, () => props.selectedPrefix, () => props.initialIri],
  () => {
    const iri = normalizeIri(props.initialIri);
    if (!iri) return;
    trySelectRowForIri(iri);
  },
  {deep: false}
);

function resetPaging() {
  firstByType[RdfPropertyType.DatatypeProperty] = 0;
  firstByType[RdfPropertyType.ObjectProperty] = 0;
  firstByType[RdfPropertyType.Class] = 0;
}

function clearSelections() {
  selectedRowsByType[RdfPropertyType.DatatypeProperty] = null;
  selectedRowsByType[RdfPropertyType.ObjectProperty] = null;
  selectedRowsByType[RdfPropertyType.Class] = null;
}

function isOntologyPropertyType(value: string): value is OntologyPropertyType {
  return (
    value === RdfPropertyType.DatatypeProperty ||
    value === RdfPropertyType.ObjectProperty ||
    value === RdfPropertyType.Class
  );
}

function isTabEnabled(propertyType: OntologyPropertyType): boolean {
  if (propertyType === RdfPropertyType.Class) return !isPredicateMode.value;
  return isPredicateMode.value;
}

function onFirstChange(propertyType: OntologyPropertyType, value: number) {
  firstByType[propertyType] = value;
}

function onSelectionChange(propertyType: OntologyPropertyType, value: OntologyRow | null) {
  selectedRowsByType[propertyType] = value;
}

function setTableRef(propertyType: OntologyPropertyType, el: any | null) {
  tableRefsByType[propertyType] = el;
}

function filterRows(rows: OntologyRow[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter(
    row =>
      row.about.toLowerCase().includes(normalized) || row.comment.toLowerCase().includes(normalized)
  );
}

function termNameFromIri(iri: string): string {
  if (!iri) return '';
  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  const splitIndex = Math.max(hashIndex, slashIndex);
  if (splitIndex === -1 || splitIndex === iri.length - 1) {
    return iri;
  }
  return decodeURIComponent(iri.slice(splitIndex + 1));
}

function buildOntologyTermHref(about: string): string {
  if (!about) return '';
  const namespace = props.selectedPrefix ? props.prefixNamespaces[props.selectedPrefix] ?? '' : '';
  if (!namespace) return about;
  if (about.startsWith(namespace)) return about;
  return `${namespace}${termNameFromIri(about)}`;
}

function rowMatchesIri(rowAbout: string, iri: string, namespace: string): boolean {
  if (rowAbout === iri) return true;
  if (!namespace) return false;
  return `${namespace}${termNameFromIri(rowAbout)}` === iri;
}

function isRowTypeEnabled(propertyType: OntologyPropertyType): boolean {
  return isTabEnabled(propertyType);
}

function trySelectRowForIri(iri: string) {
  if (!iri || !props.selectedPrefix || !props.rows.length) return;
  const namespace = props.prefixNamespaces[props.selectedPrefix] ?? '';
  const match = props.rows.find(row => rowMatchesIri(row.about, iri, namespace));
  if (!match || !isRowTypeEnabled(match.propertyType)) return;

  if (match.propertyType === 'DatatypeProperty') {
    internalActiveTab.value = 'DatatypeProperty';
  } else if (match.propertyType === 'Class') {
    internalActiveTab.value = 'Class';
  } else {
    internalActiveTab.value = 'ObjectProperty';
  }
  clearSelections();
  selectedRowsByType[match.propertyType] = match;
  focusMatchedRow(match);
}

async function focusMatchedRow(match: {about: string; propertyType: OntologyPropertyType}) {
  await nextTick();
  window.setTimeout(async () => {
    await nextTick();
    const rows = filteredRowsByType.value[match.propertyType];
    const index = rows.findIndex(row => row.about === match.about);
    if (index < 0) return;

    const pageFirst = Math.floor(index / props.rowsPerPage) * props.rowsPerPage;
    if (firstByType[match.propertyType] !== pageFirst) {
      firstByType[match.propertyType] = pageFirst;
      await nextTick();
    }

    const tableRef = tableRefsByType[match.propertyType];
    const tableEl = tableRef?.$el as HTMLElement | undefined;
    const localIndex = index % props.rowsPerPage;
    const rowEl = tableEl?.querySelector(`tr[data-p-index="${localIndex}"]`) as HTMLElement | null;
    if (!rowEl) return;

    rowEl.scrollIntoView({behavior: 'smooth', block: 'center'});
    rowEl.focus();
  }, 140);
}
</script>

<style scoped>
.wrapped-comment {
  white-space: pre-wrap;
  word-break: break-word;
}

.ontology-term-link {
  color: var(--p-primary-color);
  text-decoration: underline;
}

.ontology-term-link:hover {
  color: var(--p-primary-hover-color, var(--p-primary-color));
}
</style>
