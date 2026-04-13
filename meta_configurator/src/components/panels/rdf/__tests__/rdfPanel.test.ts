import {describe, expect, it, vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineComponent, ref} from 'vue';
import {mount} from '@vue/test-utils';
import {SessionMode} from '@/store/sessionMode';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(dirname, 'fixtures', 'rdf-panel');

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf-8');
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

const PanelSettingsStub = defineComponent({template: '<div />'});
const RmlMappingDialogStub = defineComponent({
  template: '<div />',
  methods: {show: vi.fn()},
});
const ImportTurtleDialogStub = defineComponent({
  template: '<div />',
  methods: {show: vi.fn()},
});
const MessageStub = defineComponent({template: '<div><slot /></div>'});
const RdfTabPanelStub = defineComponent({template: '<div />'});
const VARIABLE_ELEMENT_SIZE_IRI = 'https://www.example.org/variable_element_size';
const RDFS_LABEL_IRI = 'http://www.w3.org/2000/01/rdf-schema#label';
const ORIGINAL_LABEL = 'element_size';
const UPDATED_LABEL = 'element_size_updated';

describe('RdfPanel', () => {
  it('loads fixture data, edits one rdf statement, deletes it, adds it back, and updates editor data', async () => {
    vi.resetModules();
    (globalThis as any).window = globalThis as any;

    const inputJsonLd = JSON.parse(readFixture('input.json'));
    const expectedEditedJsonLd = JSON.parse(readFixture('edit_expected.json'));
    const expectedDeletedJsonLd = JSON.parse(readFixture('delete_expected.json'));
    const expectedAddedJsonLd = JSON.parse(readFixture('add_expected.json'));
    const dataRef = ref<any>({});
    const dataAtCurrentPath = ref<any>(null);
    const currentPath = ref<any>([]);
    const currentSelectedElement = ref<any>([]);

    vi.doMock('@/data/useDataLink', () => ({
      getDataForMode: () => ({
        data: dataRef,
        shallowDataRef: dataRef,
        dataAtCurrentPath,
        isDataUnparseable: () => false,
        setData: (value: any) => {
          dataRef.value = value;
        },
      }),
      getSessionForMode: () => ({
        currentPath,
        currentSelectedElement,
        updateCurrentPath: (path: any) => {
          currentPath.value = path;
        },
        updateCurrentSelectedElement: (path: any) => {
          currentSelectedElement.value = path;
        },
      }),
    }));

    vi.doMock('rdflib', async () => {
      const {createRequire} = await import('node:module');
      const require = createRequire(import.meta.url);
      return require('rdflib');
    });

    const RdfPanel = (await import('@/components/panels/rdf/RdfPanel.vue')).default;
    const {rdfStoreManager} = await import('@/components/panels/rdf/rdfStoreManager');
    const {TripleEditorService} = await import('@/components/panels/rdf/tripleEditorService');
    const {RdfTermType} = await import('@/components/panels/rdf/rdfUtils');
    const {RdfMediaType} = await import('@/components/panels/rdf/rdfEnums');

    const getExportedJsonLd = () =>
      JSON.parse(rdfStoreManager.exportAs(RdfMediaType.JsonLd).content ?? '{"@graph":[]}');

    mount(RdfPanel, {
      props: {sessionMode: SessionMode.DataEditor},
      global: {
        stubs: {
          PanelSettings: PanelSettingsStub,
          RmlMappingDialog: RmlMappingDialogStub,
          ImportTurtleDialog: ImportTurtleDialogStub,
          Message: MessageStub,
          RdfTabPanel: RdfTabPanelStub,
        },
      },
    });

    dataRef.value = inputJsonLd;
    await waitUntil(() => rdfStoreManager.statements.value.length > 0);

    const target = rdfStoreManager.statements.value.find(
      st =>
        st.subject.value === VARIABLE_ELEMENT_SIZE_IRI &&
        st.predicate.value === RDFS_LABEL_IRI &&
        st.object.termType === RdfTermType.Literal
    );
    expect(target).toBeDefined();

    const result = TripleEditorService.addOrEdit({
      subject: target!.subject.value,
      subjectType: target!.subject.termType,
      predicate: target!.predicate.value,
      predicateType: target!.predicate.termType,
      object: UPDATED_LABEL,
      objectType: RdfTermType.Literal,
      objectDatatype: target!.object.datatype?.value ?? '',
      statement: target,
    });

    expect(result.success).toBe(true);

    await waitUntil(() =>
      rdfStoreManager.statements.value.some(
        st =>
          st.subject.value === VARIABLE_ELEMENT_SIZE_IRI &&
          st.predicate.value === RDFS_LABEL_IRI &&
          st.object.termType === RdfTermType.Literal &&
          st.object.value === UPDATED_LABEL
      )
    );
    await waitUntil(
      () => JSON.stringify(getExportedJsonLd()) === JSON.stringify(expectedEditedJsonLd)
    );
    expect(getExportedJsonLd()).toEqual(expectedEditedJsonLd);

    const editedStatement = rdfStoreManager.statements.value.find(
      st =>
        st.subject.value === VARIABLE_ELEMENT_SIZE_IRI &&
        st.predicate.value === RDFS_LABEL_IRI &&
        st.object.termType === RdfTermType.Literal &&
        st.object.value === UPDATED_LABEL
    );
    expect(editedStatement).toBeDefined();

    const deleteResult = TripleEditorService.delete(editedStatement!);
    expect(deleteResult.success).toBe(true);

    await waitUntil(
      () =>
        !rdfStoreManager.statements.value.some(
          st =>
            st.subject.value === VARIABLE_ELEMENT_SIZE_IRI && st.predicate.value === RDFS_LABEL_IRI
        )
    );
    await waitUntil(
      () => JSON.stringify(getExportedJsonLd()) === JSON.stringify(expectedDeletedJsonLd)
    );
    expect(getExportedJsonLd()).toEqual(expectedDeletedJsonLd);

    const addResult = TripleEditorService.addOrEdit({
      subject: editedStatement!.subject.value,
      subjectType: editedStatement!.subject.termType,
      predicate: editedStatement!.predicate.value,
      predicateType: editedStatement!.predicate.termType,
      object: ORIGINAL_LABEL,
      objectType: RdfTermType.Literal,
      objectDatatype: editedStatement!.object.datatype?.value ?? '',
    });
    expect(addResult.success).toBe(true);

    await waitUntil(() =>
      rdfStoreManager.statements.value.some(
        st =>
          st.subject.value === VARIABLE_ELEMENT_SIZE_IRI &&
          st.predicate.value === RDFS_LABEL_IRI &&
          st.object.termType === RdfTermType.Literal &&
          st.object.value === ORIGINAL_LABEL
      )
    );
    await waitUntil(
      () => JSON.stringify(getExportedJsonLd()) === JSON.stringify(expectedAddedJsonLd)
    );
    expect(getExportedJsonLd()).toEqual(expectedAddedJsonLd);
  });
});
