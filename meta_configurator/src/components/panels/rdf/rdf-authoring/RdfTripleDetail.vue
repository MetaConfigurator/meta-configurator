<template>
  <Dialog
    v-model:visible="visible"
    header="Triple Details"
    modal
    maximizable
    :draggable="false"
    :style="{width: '50vw', height: '50vh'}"
    contentStyle="overflow-y: auto">
    <div ref="tripleDetailRoot" class="flex flex-col gap-6 w-full">
      <div>
        <label class="block font-bold mb-3">Subject</label>
        <div class="flex gap-2 w-full items-center">
          <Select
            v-model="localTriple.subjectType"
            :options="subjectTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="fixed-select"
            :disabled="props.disableSubject" />
          <template v-if="localTriple.subjectType === RdfTermType.NamedNode">
            <Select
              v-model="localTriple.subject"
              :options="filteredSubjectNodes"
              editable
              optionLabel="label"
              optionValue="value"
              placeholder="Select or type IRI"
              class="flex-1 min-w-[260px]"
              :disabled="props.disableSubject" />
          </template>
          <template v-else>
            <InputText
              v-model.trim="localTriple.subject"
              required
              class="flex-1 min-w-[260px]"
              :disabled="
                props.disableSubject || localTriple.subjectType === RdfTermType.BlankNode
              " />
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
          <Select
            v-model="localTriple.predicate"
            :options="filteredPredicateNodes"
            editable
            optionLabel="label"
            optionValue="value"
            placeholder="Select or type IRI"
            class="flex-1 min-w-[260px]" />
          <Button
            icon="pi pi-compass"
            severity="contrast"
            variant="text"
            rounded
            @click="openOntologyExplorer(OntologySourceField.Predicate)" />
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
              offIcon="pi pi-list" />
            <Select
              v-if="!useCustomDatatype"
              v-model="localTriple.objectDatatype"
              :options="objectDatatypeOptions"
              optionLabel="label"
              optionValue="value"
              class="flex-1 min-w-[200px]"
              placeholder="Type" />
            <InputText
              v-else
              v-model.trim="localTriple.objectDatatype"
              placeholder="Datatype IRI or prefix"
              class="flex-1 min-w-[200px]" />
          </template>
          <template v-if="localTriple.objectType !== RdfTermType.Literal">
            <Select
              v-model="localTriple.object"
              :options="filteredObjectNodes"
              editable
              :disabled="localTriple.objectType === RdfTermType.BlankNode"
              optionLabel="label"
              optionValue="value"
              placeholder="Select or type IRI"
              class="flex-1 min-w-[260px]" />
          </template>
          <template v-else>
            <InputText v-model.trim="localTriple.object" required class="flex-1 min-w-[260px]" />
          </template>
          <Button
            v-if="localTriple.objectType === RdfTermType.NamedNode"
            icon="pi pi-compass"
            severity="contrast"
            variant="text"
            rounded
            @click="openOntologyExplorer(OntologySourceField.Object)" />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center gap-2 pt-3 w-full">
        <Button
          v-if="showBlankNodeHint"
          label="Blank Node Handling"
          icon="pi pi-question-circle"
          severity="secondary"
          variant="text"
          @click="helpDialogVisible = true" />
        <div class="flex gap-2 ml-auto">
          <Button label="Cancel" severity="secondary" @click="visible = false" />
          <Button label="Save" @click="saveTriple" />
        </div>
      </div>
    </template>
  </Dialog>
  <RdfTripleDetailHelpDialog
    :visible="helpDialogVisible"
    @update:visible="helpDialogVisible = $event" />
  <Dialog
    v-model:visible="ontologyExplorerDialog"
    :header="ontologyExplorerDialogTitle"
    modal
    maximizable
    :style="{width: '1200px', height: '900px'}"
    :contentStyle="{height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column'}">
    <RdfOntologyExplorer
      :sourceField="ontologyExplorerTarget"
      :initialIri="ontologyExplorerInitialIri"
      @select-iri="applyOntologySelection" />
  </Dialog>
</template>

<script setup lang="ts">
import {computed, nextTick, onUnmounted, ref, watch} from 'vue';
import ToggleButton from 'primevue/togglebutton';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import {RdfChangeType, RdfTermType} from '@/components/panels/rdf/rdfUtils';
import {useErrorService} from '@/utility/errorServiceInstance';
import {
  TripleEditorService,
  type TripleTransferObject,
} from '@/components/panels/rdf/tripleEditorService';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';
import {
  COMMON_DATATYPES,
  isCommonDatatype,
  validateLiteralBeforeSave,
} from '@/components/panels/rdf/tripleLiteralValidationService';
import RdfOntologyExplorer from '@/components/panels/rdf/ontology-explorer/RdfOntologyExplorer.vue';
import {OntologySourceField} from '@/components/panels/rdf/rdfEnums';
import RdfTripleDetailHelpDialog from '@/components/panels/rdf/rdf-authoring/RdfTripleDetailHelpDialog.vue';

const props = withDefaults(
  defineProps<{
    triple: TripleTransferObject;
    disableSubject?: boolean;
  }>(),
  {
    disableSubject: false,
  }
);

const emit = defineEmits<{
  (e: 'saved', payload: {action: RdfChangeType; triple: TripleTransferObject}): void;
}>();

const visible = ref(false);
const helpDialogVisible = ref(false);
const useCustomDatatype = ref(false);
const ontologyExplorerDialog = ref(false);
const ontologyExplorerTarget = ref<OntologySourceField>(OntologySourceField.Predicate);
const ontologyExplorerInitialIri = ref('');
const subjectTypeOptions = [
  {label: 'Named Node', value: RdfTermType.NamedNode},
  {label: 'Blank Node', value: RdfTermType.BlankNode},
];
const predicateTypeOptions = [{label: 'Named Node', value: RdfTermType.NamedNode}];
const objectTypeOptions = [
  {label: 'Named Node', value: RdfTermType.NamedNode},
  {label: 'Blank Node', value: RdfTermType.BlankNode},
  {label: 'Literal', value: RdfTermType.Literal},
];
const localTriple = ref<TripleTransferObject>({...props.triple});
const tripleDetailRoot = ref<HTMLElement | null>(null);

let stopClickListener: ((event: Event) => void) | null = null;
let stopKeydownListener: ((event: Event) => void) | null = null;

function detachPropagationGuards() {
  const root = tripleDetailRoot.value;
  if (!root) {
    stopClickListener = null;
    stopKeydownListener = null;
    return;
  }

  if (stopClickListener) {
    root.removeEventListener('click', stopClickListener);
    stopClickListener = null;
  }
  if (stopKeydownListener) {
    root.removeEventListener('keydown', stopKeydownListener);
    stopKeydownListener = null;
  }
}

watch(
  visible,
  async isVisible => {
    detachPropagationGuards();
    if (!isVisible) return;

    await nextTick();
    const root = tripleDetailRoot.value;
    if (!root) return;

    stopClickListener = (event: Event) => {
      event.stopPropagation();
    };
    stopKeydownListener = (event: Event) => {
      event.stopPropagation();
    };

    root.addEventListener('click', stopClickListener);
    root.addEventListener('keydown', stopKeydownListener);
  },
  {flush: 'post'}
);

onUnmounted(() => {
  detachPropagationGuards();
});

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

const predicates = computed(() => {
  const predicateSet = new Set<string>();
  rdfStoreManager.statements.value.forEach(st => {
    predicateSet.add(st.predicate.value);
  });
  return Array.from(predicateSet).map(p => ({label: p, value: p}));
});

function filterByQuery(
  options: Array<{label: string; value: string}>,
  query: unknown
): Array<{label: string; value: string}> {
  if (!query || typeof query !== 'string') return options;
  const lower = query.toLowerCase();
  return options.filter(opt => opt.label.toLowerCase().includes(lower));
}

const filteredSubjectNodes = computed(() => {
  return filterByQuery(nodes.value, localTriple.value.subject);
});

const filteredObjectNodes = computed(() => {
  return filterByQuery(nodes.value, localTriple.value.object);
});

const filteredPredicateNodes = computed(() => {
  return filterByQuery(predicates.value, localTriple.value.predicate);
});

const showBlankNodeHint = computed(
  () =>
    localTriple.value.subjectType === RdfTermType.BlankNode ||
    localTriple.value.objectType === RdfTermType.BlankNode
);

const ontologyExplorerDialogTitle = computed(
  () => `Ontology Explorer (${ontologyExplorerTarget.value})`
);

function openOntologyExplorer(target: OntologySourceField) {
  ontologyExplorerTarget.value = target;
  ontologyExplorerInitialIri.value =
    target === OntologySourceField.Predicate
      ? (localTriple.value.predicate ?? '').trim()
      : localTriple.value.objectType === RdfTermType.NamedNode
      ? (localTriple.value.object ?? '').trim()
      : '';
  ontologyExplorerDialog.value = true;
}

function applyOntologySelection(iri: string) {
  if (ontologyExplorerTarget.value === OntologySourceField.Predicate) {
    localTriple.value.predicate = iri;
  } else {
    localTriple.value.objectType = RdfTermType.NamedNode;
    localTriple.value.object = iri;
  }
  ontologyExplorerDialog.value = false;
}

const objectDatatypeOptions = computed(() => {
  const current = localTriple.value.objectDatatype ?? '';
  if (!current || isCommonDatatype(current)) {
    return COMMON_DATATYPES;
  }
  return [{label: jsonLdContextManager.toPrefixed(current), value: current}, ...COMMON_DATATYPES];
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
  localTriple.value = {...props.triple, objectDatatype: props.triple.objectDatatype ?? ''};
  useCustomDatatype.value =
    Boolean(props.triple.objectDatatype) && !isCommonDatatype(props.triple.objectDatatype ?? '');
  helpDialogVisible.value = false;
  visible.value = true;
}

function close() {
  helpDialogVisible.value = false;
  visible.value = false;
}

function showDialogError(summary: string, details: string) {
  useErrorService().onError({summary, details});
}

function saveTriple() {
  const validationError = validateLiteralBeforeSave(localTriple.value);
  if (validationError) {
    showDialogError('Invalid Literal Value', validationError);
    return;
  }

  const action = localTriple.value.statement ? RdfChangeType.Edit : RdfChangeType.Add;
  const result = TripleEditorService.addOrEdit(localTriple.value);
  if (!result.success) {
    showDialogError('Unable To Save Triple', result.errorMessage ?? 'Unknown error occurred.');
    return;
  }
  emit('saved', {action, triple: localTriple.value});
  visible.value = false;
}

defineExpose({open, close});
</script>
