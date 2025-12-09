import {useFileDialog} from '@vueuse/core';
import {readFileContentToStringRef} from '@/utility/readFileContent';
import type {Ref} from 'vue';
import _ from 'lodash';
import * as N3 from 'n3';
import * as jsonld from 'jsonld';

export function requestUploadFileToRef(resultString: Ref<string>) {
  const {open, onChange, reset} = useFileDialog({
    // accept only ttl files
    accept: '.ttl',
    multiple: false,
  });

  onChange((files: FileList | null) => {
    if (files && files.length > 0) {
      readFileContentToStringRef(files, resultString);
    }
    reset();
  });

  setTimeout(() => {
    open();
  }, 3);
}

/**
 * Converts Turtle format RDF data to JSON-LD
 * @param turtleString - The input string in Turtle format
 * @returns Promise resolving to JSON-LD object
 */
export async function turtleToJsonLD(turtleString: string): Promise<any> {
  const parser = new N3.Parser();
  const quads: N3.Quad[] = [];
  let prefixes: N3.Prefixes = {};

  return new Promise((resolve, reject) => {
    parser.parse(turtleString, (error, quad, pfx) => {
      if (error) return reject(error);

      if (quad) {
        quads.push(quad);
      } else {
        prefixes = pfx || {};
        convertQuadsToJsonLD(quads, prefixes).then(resolve).catch(reject);
      }
    });
  });
}

async function convertQuadsToJsonLD(quads: N3.Quad[], prefixes: N3.Prefixes): Promise<any> {
  // Write all quads manually
  const writer = new N3.Writer({format: 'N-Quads'});

  for (const quad of quads) {
    writer.addQuad(quad);
  }

  const nquads = await new Promise<string>((resolve, reject) => {
    writer.end((error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

  // Convert N-Quads → JSON-LD
  const jsonldDoc = await jsonld.fromRDF(nquads, {format: 'application/n-quads'});

  // Apply prefixes as @context
  if (prefixes && Object.keys(prefixes).length > 0) {
    const context: Record<string, string> = {};

    for (const [prefix, uri] of Object.entries(prefixes)) {
      if (prefix) context[prefix] = uri;
    }

    return jsonld.compact(jsonldDoc, context);
  }

  return;
}
