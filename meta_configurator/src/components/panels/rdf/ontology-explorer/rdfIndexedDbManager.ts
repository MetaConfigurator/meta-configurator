export const RDF_CACHE_DB_NAME = 'rdf_ontology_cache_db';
export const RDF_CACHE_DB_VERSION = 5;
export const RDF_CACHE_STORE = 'rdf_cache';

type RdfStoreName = typeof RDF_CACHE_STORE;

export type OntologyPropertyType = 'DatatypeProperty' | 'ObjectProperty' | 'Class';

const VALID_PROPERTY_TYPES = new Set<OntologyPropertyType>([
  'DatatypeProperty',
  'ObjectProperty',
  'Class',
]);

export type RdfOntologyRow = {
  about: string;
  comment: string;
  propertyType: OntologyPropertyType;
};

export type RdfCachedOntology = {
  key: string;
  ontologyIri: string;
  url: string;
  rawContent: string;
  format?: string;
  contentType?: string;
  fetchedAt: string;
  mergedGraphNTriples?: string;
  ontologyQueryResults?: RdfOntologyRow[];
  queryResultsFetchedAt?: string;
  lastSparqlQuery?: string;
};

export type RdfCachedContext = {
  key: string;
  url: string;
  rawContent: string;
  fetchedAt: string;
};

let rdfCacheDbPromise: Promise<IDBDatabase> | null = null;

export function openRdfCacheDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available.'));
  }

  if (rdfCacheDbPromise) return rdfCacheDbPromise;

  rdfCacheDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(RDF_CACHE_DB_NAME, RDF_CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RDF_CACHE_STORE)) {
        db.createObjectStore(RDF_CACHE_STORE, {keyPath: 'key'});
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () =>
      reject(new Error(request.error?.message ?? 'Failed to open RDF IndexedDB cache.'));
  }).catch(error => {
    rdfCacheDbPromise = null;
    throw error;
  });

  return rdfCacheDbPromise;
}

export async function getFromRdfStore<T>(
  storeName: RdfStoreName,
  key: IDBValidKey
): Promise<T | null> {
  const db = await openRdfCacheDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () =>
      reject(new Error(request.error?.message ?? `Failed to read from "${storeName}".`));
  });
}

export async function getAllFromRdfStore<T>(storeName: RdfStoreName): Promise<T[]> {
  const db = await openRdfCacheDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve((request.result ?? []) as T[]);
    request.onerror = () =>
      reject(new Error(request.error?.message ?? `Failed to read all from "${storeName}".`));
  });
}

async function runRwTransaction(
  storeName: RdfStoreName,
  operation: (store: IDBObjectStore) => void,
  errorPrefix: string
): Promise<void> {
  const db = await openRdfCacheDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    operation(tx.objectStore(storeName));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.message ?? `${errorPrefix} "${storeName}".`));
    tx.onabort = () =>
      reject(new Error(tx.error?.message ?? `${errorPrefix} "${storeName}" was aborted.`));
  });
}

export async function putInRdfStore<T>(storeName: RdfStoreName, value: T): Promise<void> {
  await runRwTransaction(storeName, store => store.put(value), 'Failed to write to');
}

export async function deleteFromRdfStore(storeName: RdfStoreName, key: IDBValidKey): Promise<void> {
  await runRwTransaction(storeName, store => store.delete(key), 'Failed to delete from');
}

export function getRdfCacheKey(rawKey: string): string {
  return String(rawKey ?? '').trim();
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeOntologyRow(row: Partial<RdfOntologyRow>): RdfOntologyRow {
  return {
    about: String(row?.about ?? ''),
    comment: String(row?.comment ?? ''),
    propertyType: VALID_PROPERTY_TYPES.has(row?.propertyType as OntologyPropertyType)
      ? (row.propertyType as OntologyPropertyType)
      : 'ObjectProperty',
  };
}

export function normalizeOntologyCacheEntry(
  value: Partial<RdfCachedOntology> | undefined
): RdfCachedOntology | null {
  if (!value) return null;

  const ontologyIri = getRdfCacheKey(str(value.ontologyIri));
  if (!ontologyIri) return null;

  return {
    key: getRdfCacheKey(str(value.key, ontologyIri)),
    ontologyIri,
    url: str(value.url),
    rawContent: str(value.rawContent),
    format: str(value.format) || undefined,
    contentType: str(value.contentType) || undefined,
    fetchedAt: str(value.fetchedAt),
    mergedGraphNTriples: str(value.mergedGraphNTriples) || undefined,
    ontologyQueryResults: Array.isArray(value.ontologyQueryResults)
      ? value.ontologyQueryResults.map(normalizeOntologyRow)
      : undefined,
    queryResultsFetchedAt: str(value.queryResultsFetchedAt) || undefined,
    lastSparqlQuery: str(value.lastSparqlQuery) || undefined,
  };
}

export async function getOntologyFromRdfCache(
  ontologyIri: string
): Promise<RdfCachedOntology | null> {
  const key = getRdfCacheKey(ontologyIri);
  if (!key) return null;
  const result = await getFromRdfStore<Partial<RdfCachedOntology>>(RDF_CACHE_STORE, key);
  return normalizeOntologyCacheEntry(result ?? undefined);
}

export async function putOntologyInRdfCache(entry: Partial<RdfCachedOntology>): Promise<void> {
  const normalized = normalizeOntologyCacheEntry(entry);
  if (!normalized?.ontologyIri) {
    throw new Error('Failed to cache ontology: missing ontology IRI key.');
  }
  await putInRdfStore(RDF_CACHE_STORE, {
    ...normalized,
    key: getRdfCacheKey(normalized.ontologyIri),
  });
}

export async function deleteOntologyFromRdfCache(ontologyIri: string): Promise<void> {
  const key = getRdfCacheKey(ontologyIri);
  if (key) await deleteFromRdfStore(RDF_CACHE_STORE, key);
}

export async function getContextFromRdfCache(url: string): Promise<RdfCachedContext | null> {
  const key = getRdfCacheKey(url);
  if (!key) return null;
  const result = await getFromRdfStore<Partial<RdfCachedContext>>(RDF_CACHE_STORE, key);
  if (!result) return null;

  return {
    key,
    url: str(result.url, key),
    rawContent: str(result.rawContent),
    fetchedAt: str(result.fetchedAt),
  };
}

export async function putContextInRdfCache(entry: Partial<RdfCachedContext>): Promise<void> {
  const key = getRdfCacheKey(str(entry.url ?? entry.key ?? ''));
  if (!key) throw new Error('Failed to cache context: missing context URL key.');

  await putInRdfStore<RdfCachedContext>(RDF_CACHE_STORE, {
    key,
    url: key,
    rawContent: str(entry.rawContent),
    fetchedAt: str(entry.fetchedAt) || new Date().toISOString(),
  });
}
