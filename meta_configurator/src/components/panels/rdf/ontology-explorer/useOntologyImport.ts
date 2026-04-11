import type {Ref} from 'vue';
import type {RdfCachedOntology} from '@/components/panels/rdf/ontology-explorer/rdfIndexedDbManager';
import {RdfMediaType, RdfProxyPath, RdfStatusSeverity} from '@/components/panels/rdf/rdfEnums';
import {
  detectRdfFormat,
  parseRdfToStore,
  serializeStoreToNTriples,
} from '@/components/panels/rdf/ontology-explorer/rdfOntologyUtils';

type CachedOntology = RdfCachedOntology;

const ACCEPT_RDF_HEADER = `${RdfMediaType.RdfXml}, ${RdfMediaType.Turtle}, ${RdfMediaType.XTurtle}, ${RdfMediaType.NTriples}, ${RdfMediaType.N3}, ${RdfMediaType.JsonLd}, ${RdfMediaType.Json}, ${RdfMediaType.Xml}, ${RdfMediaType.TextXml}, ${RdfMediaType.TextPlain}`;
const RDF_FILE_ACCEPT = `.rdf,.owl,.xml,.ttl,.nt,.n3,.jsonld,.json,${RdfMediaType.RdfXml},${RdfMediaType.Turtle},${RdfMediaType.XTurtle},${RdfMediaType.NTriples},${RdfMediaType.N3},${RdfMediaType.JsonLd},${RdfMediaType.Json},${RdfMediaType.Xml},${RdfMediaType.TextXml},${RdfMediaType.TextPlain}`;

export function useOntologyImport(options: {
  selectedPrefix: Ref<string | null>;
  ontologyUrl: Ref<string>;
  loadedCacheEntry: Ref<CachedOntology | null>;
  isDownloading: Ref<boolean>;
  isUploading: Ref<boolean>;
  ontologyFileUploadRef: Ref<any | null>;
  getOntologyIriForPrefix: (prefix: string) => string;
  setStatus: (message: string, severity?: RdfStatusSeverity) => void;
  putOntologyToIndexedDb: (entry: CachedOntology) => Promise<void>;
  loadOntologyCards: () => Promise<void>;
}) {
  async function downloadAndCacheOntology() {
    if (!options.selectedPrefix.value) {
      options.setStatus('Please select a prefix first.', RdfStatusSeverity.Warn);
      return;
    }

    const ontologyPrefix = options.selectedPrefix.value;
    const ontologyIri = options.getOntologyIriForPrefix(ontologyPrefix);
    if (!ontologyIri) {
      options.setStatus(
        `No ontology IRI found in @context for prefix "${ontologyPrefix}".`,
        RdfStatusSeverity.Warn
      );
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(options.ontologyUrl.value);
    } catch {
      options.setStatus('Please enter a valid URL.', RdfStatusSeverity.Warn);
      return;
    }

    options.isDownloading.value = true;
    options.setStatus('');

    try {
      const {response, usedProxy} = await fetchOntologyWithCorsFallback(parsedUrl.toString());
      if (!response.ok) {
        throw new Error(
          `Download failed with HTTP ${response.status} for ${parsedUrl.toString()}.`
        );
      }

      const contentType = response.headers.get('content-type') ?? '';
      const format = detectRdfFormat(contentType, parsedUrl.toString());
      if (!format) {
        throw new Error(`Only RDF files are supported (${parsedUrl.toString()}).`);
      }

      const content = await response.text();
      const store = await parseRdfToStore(content, parsedUrl.toString(), format);
      const mergedGraphNTriples = serializeStoreToNTriples(store);

      const cacheEntry: CachedOntology = {
        key: ontologyIri,
        ontologyIri,
        url: parsedUrl.toString(),
        rawContent: content,
        format,
        contentType,
        fetchedAt: new Date().toISOString(),
        mergedGraphNTriples,
      };

      options.loadedCacheEntry.value = cacheEntry;
      await options.putOntologyToIndexedDb(cacheEntry);
      await options.loadOntologyCards();

      options.setStatus(
        `Ontology for prefix "${ontologyPrefix}" was downloaded and cached in IndexedDB${
          usedProxy ? ' (via local proxy)' : ''
        }.`,
        RdfStatusSeverity.Success
      );
    } catch (error: any) {
      options.setStatus(error?.message ?? 'Failed to download ontology.', RdfStatusSeverity.Error);
    } finally {
      options.isDownloading.value = false;
    }
  }

  async function onOntologyFileSelected(event: any) {
    const file = Array.isArray(event?.files) ? event.files[0] : null;
    if (!file) return;

    if (!options.selectedPrefix.value) {
      options.setStatus('Please select a prefix first.', RdfStatusSeverity.Warn);
      options.ontologyFileUploadRef.value?.clear?.();
      return;
    }

    const ontologyPrefix = options.selectedPrefix.value;
    const ontologyIri = options.getOntologyIriForPrefix(ontologyPrefix);
    if (!ontologyIri) {
      options.setStatus(
        `No ontology IRI found in @context for prefix "${ontologyPrefix}".`,
        RdfStatusSeverity.Warn
      );
      options.ontologyFileUploadRef.value?.clear?.();
      return;
    }

    options.isUploading.value = true;
    options.setStatus('');

    try {
      const contentType = file.type || RdfMediaType.OctetStream;
      const format = detectRdfFormat(contentType, file.name);
      if (!format) {
        throw new Error('Only RDF files are supported.');
      }

      const content = await file.text();
      const fileUrl = `file://${encodeURIComponent(file.name)}`;
      const store = await parseRdfToStore(content, fileUrl, format);
      const mergedGraphNTriples = serializeStoreToNTriples(store);

      const cacheEntry: CachedOntology = {
        key: ontologyIri,
        ontologyIri,
        url: fileUrl,
        rawContent: content,
        format,
        contentType,
        fetchedAt: new Date().toISOString(),
        mergedGraphNTriples,
      };

      options.loadedCacheEntry.value = cacheEntry;
      await options.putOntologyToIndexedDb(cacheEntry);
      await options.loadOntologyCards();

      options.setStatus(
        `Ontology file "${file.name}" for prefix "${ontologyPrefix}" was uploaded and cached in IndexedDB.`,
        RdfStatusSeverity.Success
      );
    } catch (error: any) {
      options.setStatus(
        error?.message ?? 'Failed to upload ontology file.',
        RdfStatusSeverity.Error
      );
    } finally {
      options.isUploading.value = false;
      options.ontologyFileUploadRef.value?.clear?.();
    }
  }

  return {
    RDF_FILE_ACCEPT,
    downloadAndCacheOntology,
    onOntologyFileSelected,
  };
}

async function fetchOntologyWithCorsFallback(
  targetUrl: string
): Promise<{response: Response; usedProxy: boolean}> {
  try {
    const directResponse = await fetch(targetUrl, {
      headers: {Accept: ACCEPT_RDF_HEADER},
    });
    return {response: directResponse, usedProxy: false};
  } catch {
    const proxyUrl = `${RdfProxyPath.Endpoint}?url=${encodeURIComponent(targetUrl)}`;
    const proxiedResponse = await fetch(proxyUrl, {
      headers: {Accept: ACCEPT_RDF_HEADER},
    });
    return {response: proxiedResponse, usedProxy: true};
  }
}
