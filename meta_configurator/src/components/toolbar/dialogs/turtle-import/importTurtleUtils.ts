import {useFileDialog} from '@vueuse/core';
import {readFileContentToStringRef} from '@/utility/readFileContent';
import {RdfMediaType} from '@/components/panels/rdf/rdfEnums';
import {useSettings} from '@/settings/useSettings';
import type {Ref} from 'vue';
import * as $rdf from 'rdflib';

const settings = useSettings();

export function requestUploadFileToRef(resultString: Ref<string>): void {
  const {open, onChange, reset} = useFileDialog({
    accept: '.ttl',
    multiple: false,
  });

  onChange((files: FileList | null) => {
    if (files && files.length > 0) {
      readFileContentToStringRef(files, resultString);
    }
    reset();
  });

  setTimeout(open, 3);
}

/**
 * Converts Turtle format RDF data to JSON-LD.
 * @param turtleString - The input string in Turtle format
 * @returns Promise resolving to a JSON-LD object
 */
export async function turtleToJsonLD(turtleString: string): Promise<any> {
  const store = await parseTurtle(turtleString);
  const serialized = serialize(store, RdfMediaType.JsonLd);
  const parsed = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  return ensureGraphWrapper(parsed);
}

function parseTurtle(turtleString: string): Promise<$rdf.IndexedFormula> {
  return new Promise((resolve, reject) => {
    const store = $rdf.graph();

    $rdf.parse(
      turtleString,
      store as $rdf.Formula,
      settings.value.rdf.baseUri,
      RdfMediaType.Turtle,
      error => {
        if (error) {
          reject(error);
          return;
        }
        resolve(store);
      }
    );
  });
}

function serialize(store: $rdf.IndexedFormula, format: string): string {
  const serialized = $rdf.serialize(
    null,
    store as $rdf.Formula,
    settings.value.rdf.baseUri,
    format
  );
  if (!serialized) {
    throw new Error('Failed to serialize Turtle data to JSON-LD.');
  }
  return serialized;
}

function ensureGraphWrapper(data: any): any {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  if ('@graph' in data) {
    return data;
  }

  const {'@context': context, ...rest} = data;
  const hasRootData = Object.keys(rest).length > 0;

  return {
    ...(context !== undefined ? {'@context': context} : {}),
    '@graph': hasRootData ? [rest] : [],
  };
}
