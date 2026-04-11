/**
 * Canonical names used by the shared RDF cache database.
 */
export enum RdfCacheConfig {
  DbName = 'rdf_ontology_cache_db',
  StoreName = 'rdf_cache',
  DbVersion = 5,
}

/**
 * Previous store names kept for one-time migration cleanup.
 */
export enum RdfLegacyStoreName {
  OntologySources = 'ontology_sources',
  OntologyGraphs = 'ontology_graphs',
  JsonLdContexts = 'jsonld_contexts',
}

export const RDF_CACHE_DB_NAME = RdfCacheConfig.DbName;
export const RDF_CACHE_DB_VERSION = RdfCacheConfig.DbVersion;
export const RDF_CACHE_STORE = RdfCacheConfig.StoreName;

type RdfStoreName = typeof RDF_CACHE_STORE;

export type OntologyPropertyType = 'DatatypeProperty' | 'ObjectProperty' | 'Class';

export type RdfOntologyRow = {
  about: string;
  comment: string;
  propertyType: OntologyPropertyType;
};

type LegacyCachedOntology = {
  content?: unknown;
  lastCustomSparqlQuery?: unknown;
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

/**
 * Opens (and memoizes) the shared RDF IndexedDB database connection.
 */
export function openRdfCacheDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available.'));
  }

  if (rdfCacheDbPromise) return rdfCacheDbPromise;

  rdfCacheDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(RDF_CACHE_DB_NAME, RDF_CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RDF_CACHE_STORE)) {
        db.createObjectStore(RDF_CACHE_STORE, {keyPath: 'key'});
      }

      const obsoleteStores = [
        RdfLegacyStoreName.OntologySources,
        RdfLegacyStoreName.OntologyGraphs,
        RdfLegacyStoreName.JsonLdContexts,
      ];
      for (const storeName of obsoleteStores) {
        if (db.objectStoreNames.contains(storeName)) {
          db.deleteObjectStore(storeName);
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => {
      reject(new Error(request.error?.message || 'Failed to open RDF IndexedDB cache.'));
    };
  });

  rdfCacheDbPromise = rdfCacheDbPromise.catch(error => {
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
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve((request.result as T | undefined) ?? null);
    };
    request.onerror = () => {
      reject(new Error(request.error?.message || `Failed to read from "${storeName}".`));
    };
  });
}

/**
 * Reads all records from a specific RDF object store.
 */
export async function getAllFromRdfStore<T>(storeName: RdfStoreName): Promise<T[]> {
  const db = await openRdfCacheDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((Array.isArray(request.result) ? request.result : []) as T[]);
    };
    request.onerror = () => {
      reject(new Error(request.error?.message || `Failed to read from "${storeName}".`));
    };
  });
}

/**
 * Writes/updates a single record in an RDF object store.
 */
export async function putInRdfStore<T>(storeName: RdfStoreName, value: T): Promise<void> {
  const db = await openRdfCacheDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(value);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.message || `Failed to write to "${storeName}".`));
    tx.onabort = () =>
      reject(new Error(tx.error?.message || `Write to "${storeName}" was aborted.`));
  });
}

/**
 * Deletes a single record from an RDF object store.
 */
export async function deleteFromRdfStore(storeName: RdfStoreName, key: IDBValidKey): Promise<void> {
  const db = await openRdfCacheDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(key);

    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(new Error(tx.error?.message || `Failed to delete from "${storeName}".`));
    tx.onabort = () =>
      reject(new Error(tx.error?.message || `Delete from "${storeName}" was aborted.`));
  });
}

/**
 * Normalizes external cache keys to a stable IndexedDB key format.
 */
export function getRdfCacheKey(rawKey: string): string {
  return String(rawKey ?? '').trim();
}

/**
 * Normalizes potentially incomplete or legacy ontology cache records
 * into the canonical {@link RdfCachedOntology} shape.
 */
export function normalizeOntologyCacheEntry(
  value:
    | Partial<RdfCachedOntology>
    | (Partial<RdfCachedOntology> & LegacyCachedOntology)
    | undefined
): RdfCachedOntology | null {
  if (!value) return null;

  const ontologyIri =
    typeof value.ontologyIri === 'string' ? getRdfCacheKey(value.ontologyIri) : '';
  if (!ontologyIri) return null;

  const rawContent =
    typeof value.rawContent === 'string'
      ? value.rawContent
      : typeof value.content === 'string'
      ? value.content
      : '';

  return {
    key: getRdfCacheKey(value.key ?? ontologyIri),
    ontologyIri,
    url: typeof value.url === 'string' ? value.url : '',
    rawContent,
    format: typeof value.format === 'string' ? value.format : undefined,
    contentType: typeof value.contentType === 'string' ? value.contentType : undefined,
    fetchedAt: typeof value.fetchedAt === 'string' ? value.fetchedAt : '',
    mergedGraphNTriples:
      typeof value.mergedGraphNTriples === 'string' ? value.mergedGraphNTriples : '',
    ontologyQueryResults: Array.isArray(value.ontologyQueryResults)
      ? value.ontologyQueryResults.map(row => ({
          about: String(row?.about ?? ''),
          comment: String(row?.comment ?? ''),
          propertyType:
            row?.propertyType === 'DatatypeProperty' ||
            row?.propertyType === 'ObjectProperty' ||
            row?.propertyType === 'Class'
              ? row.propertyType
              : 'ObjectProperty',
        }))
      : undefined,
    queryResultsFetchedAt:
      typeof value.queryResultsFetchedAt === 'string' ? value.queryResultsFetchedAt : undefined,
    lastSparqlQuery:
      typeof value.lastSparqlQuery === 'string'
        ? value.lastSparqlQuery
        : typeof value.lastCustomSparqlQuery === 'string'
        ? value.lastCustomSparqlQuery
        : undefined,
  };
}

/**
 * Reads one ontology cache record by ontology IRI.
 */
export async function getOntologyFromRdfCache(
  ontologyIri: string
): Promise<RdfCachedOntology | null> {
  const key = getRdfCacheKey(ontologyIri);
  if (!key) return null;
  const result = await getFromRdfStore<Partial<RdfCachedOntology> & LegacyCachedOntology>(
    RDF_CACHE_STORE,
    key
  );
  return normalizeOntologyCacheEntry(result ?? undefined);
}

/**
 * Stores one ontology cache record.
 */
export async function putOntologyInRdfCache(entry: Partial<RdfCachedOntology>): Promise<void> {
  const normalizedEntry = normalizeOntologyCacheEntry(entry);
  if (!normalizedEntry?.ontologyIri) {
    throw new Error('Failed to cache ontology: missing ontology IRI key.');
  }
  await putInRdfStore(RDF_CACHE_STORE, {
    ...normalizedEntry,
    key: getRdfCacheKey(normalizedEntry.ontologyIri),
  });
}

/**
 * Removes one ontology cache record by ontology IRI.
 */
export async function deleteOntologyFromRdfCache(ontologyIri: string): Promise<void> {
  const key = getRdfCacheKey(ontologyIri);
  if (!key) return;
  await deleteFromRdfStore(RDF_CACHE_STORE, key);
}

/**
 * Reads one JSON-LD context cache record by URL.
 */
export async function getContextFromRdfCache(url: string): Promise<RdfCachedContext | null> {
  const key = getRdfCacheKey(url);
  if (!key) return null;
  const result = await getFromRdfStore<Partial<RdfCachedContext>>(RDF_CACHE_STORE, key);
  if (!result) return null;

  return {
    key,
    url: typeof result.url === 'string' ? result.url : key,
    rawContent: typeof result.rawContent === 'string' ? result.rawContent : '',
    fetchedAt: typeof result.fetchedAt === 'string' ? result.fetchedAt : '',
  };
}

/**
 * Stores one JSON-LD context cache record.
 */
export async function putContextInRdfCache(entry: Partial<RdfCachedContext>): Promise<void> {
  const key = getRdfCacheKey(String(entry.url ?? entry.key ?? ''));
  if (!key) {
    throw new Error('Failed to cache context: missing context URL key.');
  }

  await putInRdfStore(RDF_CACHE_STORE, {
    key,
    url: key,
    rawContent: String(entry.rawContent ?? ''),
    fetchedAt: String(entry.fetchedAt ?? new Date().toISOString()),
  } satisfies RdfCachedContext);
}
