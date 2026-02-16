<template>
  <Dialog
    v-model:visible="visible"
    header="Triple Details"
    modal
    maximizable
    :draggable="false"
    :style="{width: '800px', height: '500px'}"
    contentStyle="overflow-y: auto">
    <div class="flex flex-col gap-6 w-full">
      <div>
        <label class="block font-bold mb-3">Subject</label>
        <div class="flex gap-2 w-full items-center">
          <Select
            v-model="localTriple.subjectType"
            :options="subjectTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="fixed-select" />
          <template v-if="localTriple.subjectType === RdfTermType.NamedNode">
            <ToggleButton
              v-model="addNewSubject"
              onLabel="New"
              offLabel="Existing"
              onIcon="pi pi-plus"
              offIcon="pi pi-list"
              class="fixed-toggle" />
            <Select
              v-if="!addNewSubject"
              v-model="localTriple.subject"
              :options="nodes"
              filter
              optionLabel="label"
              optionValue="value"
              class="flex-1 min-w-[200px]" />
            <InputText
              v-else
              v-model="localTriple.subject"
              placeholder="Enter new IRI"
              class="flex-1 min-w-[260px]" />
          </template>
          <template v-else>
            <InputText v-model.trim="localTriple.subject" required class="flex-1 min-w-[260px]" />
          </template>
        </div>
      </div>
      <div>
        <label class="block font-bold mb-3">Predicate</label>
        <div class="flex gap-2 w-full items-center">
          <Select
            v-model="localTriple.predicateType"
            :options="predicateTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="fixed-select" />
          <InputText v-model.trim="localTriple.predicate" required class="flex-1 min-w-[260px]" />
        </div>
      </div>
      <div>
        <label class="block font-bold mb-3">Object</label>
        <div class="flex gap-2 w-full items-center">
          <Select
            v-model="localTriple.objectType"
            :options="objectTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="fixed-select" />
          <template v-if="localTriple.objectType === RdfTermType.Literal">
            <ToggleButton
              v-model="useCustomDatatype"
              onLabel="Custom"
              offLabel="List"
              onIcon="pi pi-pencil"
              offIcon="pi pi-list"
              class="fixed-toggle" />
            <Select
              v-if="!useCustomDatatype"
              v-model="localTriple.objectDatatype"
              :options="objectDatatypeOptions"
              optionLabel="label"
              optionValue="value"
              class="min-w-[200px]"
              placeholder="Type" />
            <InputText
              v-else
              v-model.trim="localTriple.objectDatatype"
              placeholder="Datatype IRI or prefix"
              class="min-w-[200px]" />
          </template>
          <template v-if="localTriple.objectType === RdfTermType.NamedNode">
            <ToggleButton
              v-model="addNewObject"
              onLabel="New"
              offLabel="Existing"
              onIcon="pi pi-plus"
              offIcon="pi pi-list"
              class="fixed-toggle" />
            <Select
              v-if="!addNewObject"
              v-model="localTriple.object"
              :options="nodes"
              filter
              optionLabel="label"
              optionValue="value"
              class="flex-1 min-w-[200px]" />
            <InputText
              v-else
              v-model="localTriple.object"
              placeholder="Enter new IRI"
              class="flex-1 min-w-[260px]" />
          </template>
          <template v-else>
            <InputText v-model.trim="localTriple.object" required class="flex-1 min-w-[260px]" />
          </template>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 pt-3">
        <Button label="Cancel" severity="secondary" @click="visible = false" />
        <Button label="Save" @click="saveTriple" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import ToggleButton from 'primevue/togglebutton';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import {RdfTermType} from '@/components/panels/rdf/rdfUtils';
import {useErrorService} from '@/utility/errorServiceInstance';
import {
  TripleEditorService,
  type TripleTransferObject,
} from '@/components/panels/rdf/tripleEditorService';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';

const props = defineProps<{
  triple: TripleTransferObject;
}>();

const emit = defineEmits<{
  (e: 'saved', payload: {action: 'add' | 'edit'; triple: TripleTransferObject}): void;
}>();

const visible = ref(false);
const addNewSubject = ref(false);
const addNewObject = ref(false);
const useCustomDatatype = ref(false);

const subjectTypeOptions = [{label: 'Named Node', value: RdfTermType.NamedNode}];
const predicateTypeOptions = [{label: 'Named Node', value: RdfTermType.NamedNode}];
const objectTypeOptions = [
  {label: 'Named Node', value: RdfTermType.NamedNode},
  {label: 'Literal', value: RdfTermType.Literal},
];

const COMMON_DATATYPES = [
  {label: 'Unspecified', value: ''},
  {label: 'xsd:string', value: 'http://www.w3.org/2001/XMLSchema#string'},
  {label: 'xsd:boolean', value: 'http://www.w3.org/2001/XMLSchema#boolean'},
  {label: 'xsd:integer', value: 'http://www.w3.org/2001/XMLSchema#integer'},
  {label: 'xsd:decimal', value: 'http://www.w3.org/2001/XMLSchema#decimal'},
  {label: 'xsd:double', value: 'http://www.w3.org/2001/XMLSchema#double'},
  {label: 'xsd:float', value: 'http://www.w3.org/2001/XMLSchema#float'},
  {label: 'xsd:date', value: 'http://www.w3.org/2001/XMLSchema#date'},
  {label: 'xsd:dateTime', value: 'http://www.w3.org/2001/XMLSchema#dateTime'},
  {label: 'xsd:time', value: 'http://www.w3.org/2001/XMLSchema#time'},
  {label: 'xsd:duration', value: 'http://www.w3.org/2001/XMLSchema#duration'},
  {label: 'xsd:anyURI', value: 'http://www.w3.org/2001/XMLSchema#anyURI'},
  {label: 'xsd:long', value: 'http://www.w3.org/2001/XMLSchema#long'},
  {label: 'xsd:short', value: 'http://www.w3.org/2001/XMLSchema#short'},
  {label: 'xsd:byte', value: 'http://www.w3.org/2001/XMLSchema#byte'},
];

const localTriple = ref<TripleTransferObject>({...props.triple});

watch(
  () => props.triple,
  value => {
    localTriple.value = {...value, objectDatatype: value.objectDatatype ?? ''};
    useCustomDatatype.value =
      Boolean(value.objectDatatype) && !isCommonDatatype(value.objectDatatype ?? '');
  },
  {deep: true, immediate: true}
);

const nodes = computed(() => {
  const nodesSet = new Set<string>();
  rdfStoreManager.statements.value.forEach(st => {
    if (st.subject.termType === RdfTermType.NamedNode) {
      nodesSet.add(st.subject.value);
    }
  });
  return Array.from(nodesSet).map(n => ({label: n, value: n}));
});

function toPrefixed(iri: string): string {
  for (const [prefix, ns] of Object.entries(rdfStoreManager.namespaces.value)) {
    if (iri.startsWith(ns)) {
      return `${prefix}:${iri.slice(ns.length)}`;
    }
  }
  const xsdNs = 'http://www.w3.org/2001/XMLSchema#';
  if (iri.startsWith(xsdNs)) {
    return `xsd:${iri.slice(xsdNs.length)}`;
  }
  return iri;
}

function isCommonDatatype(value: string) {
  return COMMON_DATATYPES.some(opt => opt.value === value);
}

const objectDatatypeOptions = computed(() => {
  const current = localTriple.value.objectDatatype ?? '';
  if (!current || isCommonDatatype(current)) {
    return COMMON_DATATYPES;
  }
  return [{label: toPrefixed(current), value: current}, ...COMMON_DATATYPES];
});

watch(
  () => localTriple.value.objectType,
  value => {
    if (value !== RdfTermType.Literal) {
      localTriple.value.objectDatatype = '';
      useCustomDatatype.value = false;
    }
  }
);

watch(
  () => localTriple.value.objectDatatype,
  value => {
    if (!value) return;
    useCustomDatatype.value = !isCommonDatatype(value);
  }
);

function open() {
  addNewSubject.value = false;
  addNewObject.value = false;
  localTriple.value = {...props.triple, objectDatatype: props.triple.objectDatatype ?? ''};
  useCustomDatatype.value =
    Boolean(props.triple.objectDatatype) && !isCommonDatatype(props.triple.objectDatatype ?? '');
  visible.value = true;
}

function close() {
  visible.value = false;
}

function saveTriple() {
  const action: 'add' | 'edit' = localTriple.value.statement ? 'edit' : 'add';
  const result = TripleEditorService.addOrEdit(localTriple.value);
  if (!result.success) {
    useErrorService().onError(result.errorMessage!);
    return;
  }
  emit('saved', {action, triple: localTriple.value});
  visible.value = false;
}

defineExpose({open, close});
</script>
