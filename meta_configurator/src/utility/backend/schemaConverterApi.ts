/**
 * Communication with the Schema Conversion Orchestrator service
 * (https://github.com/MetaConfigurator/schema-conversion-orchestrator).
 *
 * The service exposes a single `/convert` endpoint that takes a schema in some
 * source language and a desired target language, finds one or more conversion
 * paths through its converter graph, and returns a ranked list of attempts
 * (best first). Each attempt either succeeded (then `result` holds the converted
 * schema) or failed (then `result` holds the error message).
 */
import {computed} from 'vue';
import {useSettings} from '@/settings/useSettings';

const settings = useSettings();

/** Base URL of the schema converter service. */
export const SCHEMA_CONVERTER_URL = computed(() => {
  return settings.value.backend.schemaConverterUrl.replace(/\/+$/, '');
});

/** One step of a conversion path, as serialized by the backend. */
export interface ConversionStep {
  sourceLanguage: string;
  targetLanguage: string;
  serviceName: string;
  converterName: string;
}

/** A single conversion attempt along one path. */
export interface ConversionAttempt {
  success: boolean;
  /** Converted schema when `success`, otherwise the error message. */
  result: string;
  conversionPath: ConversionStep[];
}

/** A schema language as understood by the converter, plus UI metadata. */
export interface SchemaLanguageOption {
  /** User-facing label shown in dropdowns. */
  label: string;
  /** Identifier sent to / received from the backend (case-insensitive there). */
  value: string;
  /** Lower-case file extensions (incl. dot) used to auto-detect this language. */
  extensions: string[];
}

/** MetaConfigurator's native language; always the import target / export source. */
export const JSON_SCHEMA_LANGUAGE = 'JsonSchema';

/**
 * Languages that can be *imported* (converted into JSON Schema). The extensions
 * are used to auto-detect the language of a selected file.
 */
export const IMPORT_SOURCE_LANGUAGES: SchemaLanguageOption[] = [
  {label: 'XSD (XML Schema)', value: 'Xsd', extensions: ['.xsd']},
  {label: 'SHACL (Turtle)', value: 'SHACL_TTL', extensions: ['.ttl', '.shacl']},
  {label: 'LinkML', value: 'LinkMl', extensions: ['.yaml', '.yml', '.linkml']},
  {label: 'MdModels', value: 'MdModels', extensions: ['.md', '.markdown']},
];

/** Languages JSON Schema can be *exported* to. */
export const EXPORT_TARGET_LANGUAGES: SchemaLanguageOption[] = [
  {label: 'XSD (XML Schema)', value: 'Xsd', extensions: ['.xsd']},
  {label: 'SHACL (Turtle)', value: 'SHACL_TTL', extensions: ['.ttl']},
  {label: 'SHACL (JSON-LD)', value: 'SHACL_JSON_LD', extensions: ['.jsonld']},
  {label: 'LinkML', value: 'LinkMl', extensions: ['.yaml']},
  {label: 'MdModels', value: 'MdModels', extensions: ['.md']},
  {label: 'GraphQL', value: 'GraphQL', extensions: ['.graphql']},
  {label: 'Protobuf', value: 'Protobuf', extensions: ['.proto']},
  {label: 'ShEx', value: 'Shex', extensions: ['.shex']},
  {label: 'OWL (Turtle)', value: 'Owl_TTL', extensions: ['.ttl']},
  {label: 'Mermaid', value: 'Mermaid', extensions: ['.mmd']},
  {label: 'SQLAlchemy', value: 'SqlAlchemy', extensions: ['.py']},
];

/** Friendly labels for languages that appear inside conversion paths. */
const LANGUAGE_LABELS: Record<string, string> = {
  JsonSchema: 'JSON Schema',
  LinkMl: 'LinkML',
  MdModels: 'MdModels',
  Dtd: 'DTD',
  Xsd: 'XSD',
  SHACL_TTL: 'SHACL (TTL)',
  SHACL_JSON_LD: 'SHACL (JSON-LD)',
  Owl_TTL: 'OWL (TTL)',
  Owl_XML: 'OWL (XML)',
  Owl_OFN: 'OWL (Functional)',
  OWL_OBO: 'OWL (OBO)',
  OntologyRdf: 'Ontology RDF',
  GraphQL: 'GraphQL',
  Protobuf: 'Protobuf',
  Shex: 'ShEx',
  Mermaid: 'Mermaid',
  SqlAlchemy: 'SQLAlchemy',
};

/** Map a backend language identifier to a human-friendly label. */
export function languageLabel(value: string): string {
  return LANGUAGE_LABELS[value] ?? value;
}

/** Whether any attempt succeeded. */
export function hasSuccessfulAttempt(attempts: ConversionAttempt[]): boolean {
  return attempts.some(a => a.success);
}

/**
 * Pick which attempts to display: prefer the successful ones, and only fall
 * back to showing failed attempts when there is no successful attempt at all.
 * Capped at `limit` (default 3), preserving the service's ranking.
 */
export function selectDisplayedAttempts(
  attempts: ConversionAttempt[],
  limit = 3
): ConversionAttempt[] {
  const successful = attempts.filter(a => a.success);
  const chosen = successful.length > 0 ? successful : attempts;
  return chosen.slice(0, limit);
}

/**
 * For a failed attempt, determine which step (edge) of the path caused the
 * failure, so it can be highlighted. The backend embeds this in the error
 * message ("... failed at step from <source> to <target> via <service> ..."),
 * which we match against the conversion path. Returns -1 if it cannot be
 * determined (or the attempt succeeded).
 */
export function failedStepIndex(attempt: ConversionAttempt): number {
  if (attempt.success) {
    return -1;
  }
  const match = /failed at step from (\S+) to (\S+) via (.+?) because of error/i.exec(
    attempt.result ?? ''
  );
  if (!match) {
    return -1;
  }
  const source = match[1];
  const target = match[2];
  const service = match[3];
  if (!source || !target || !service) {
    return -1;
  }
  return attempt.conversionPath.findIndex(
    step =>
      step.sourceLanguage === source &&
      step.targetLanguage === target &&
      step.serviceName === service.trim()
  );
}

/** Default file extension to suggest when downloading a converted schema. */
export function fileExtensionForLanguage(value: string): string {
  const known =
    EXPORT_TARGET_LANGUAGES.find(o => o.value === value) ??
    IMPORT_SOURCE_LANGUAGES.find(o => o.value === value);
  return known?.extensions[0] ?? '.txt';
}

/**
 * Auto-detect the source language of a file from its extension.
 * Returns undefined if no known extension matches.
 */
export function detectSourceLanguage(fileName: string): SchemaLanguageOption | undefined {
  const lower = fileName.toLowerCase();
  return IMPORT_SOURCE_LANGUAGES.find(opt => opt.extensions.some(ext => lower.endsWith(ext)));
}

/** Combined `accept` string for the import file picker. */
export function importFileAccept(): string {
  return IMPORT_SOURCE_LANGUAGES.flatMap(o => o.extensions).join(',');
}

/**
 * Request a conversion from the schema converter service.
 *
 * @returns the ranked list of attempts (best first).
 * @throws Error with a user-friendly message if the service is unreachable,
 *         returns a non-JSON response, or reports a request-level error
 *         (e.g. no conversion path exists, unknown language). Per-path failures
 *         are NOT thrown — they are returned as attempts with `success === false`.
 */
export async function requestSchemaConversion(
  schema: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<ConversionAttempt[]> {
  const url = `${SCHEMA_CONVERTER_URL.value}/convert`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sourceLanguage, targetLanguage, schema}),
    });
  } catch (error) {
    throw new Error(
      `Could not reach the schema conversion service at ${SCHEMA_CONVERTER_URL.value}. ` +
        `Please make sure the service is running and reachable. ` +
        `(${error instanceof Error ? error.message : String(error)})`
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Unexpected response from the schema conversion service (status ${response.status}). ` +
        (text ? `Response: ${text.slice(0, 300)}` : 'The response was not JSON.')
    );
  }

  const body = await response.json();

  if (!response.ok) {
    const message =
      body && typeof body.error === 'string'
        ? body.error
        : `Schema conversion request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!body || !Array.isArray(body.results)) {
    throw new Error('Invalid response from the schema conversion service: missing "results".');
  }

  return body.results as ConversionAttempt[];
}
