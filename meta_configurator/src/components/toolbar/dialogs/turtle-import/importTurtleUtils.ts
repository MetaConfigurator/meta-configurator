import {useFileDialog} from '@vueuse/core';
import {readFileContentToStringRef} from '@/utility/readFileContent';
import type {Ref} from 'vue';
import * as N3 from 'n3';
import * as jsonld from 'jsonld';

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
  const {quads, prefixes} = await parseTurtle(turtleString);
  return convertQuadsToJsonLD(quads, prefixes);
}

function parseTurtle(turtleString: string): Promise<{quads: N3.Quad[]; prefixes: N3.Prefixes}> {
  return new Promise((resolve, reject) => {
    const parser = new N3.Parser();
    const quads: N3.Quad[] = [];

    parser.parse(turtleString, (error: any, quad: any, prefixes: Record<string, string>) => {
      if (error) return reject(error);

      if (quad) {
        quads.push(quad);
      } else {
        resolve({quads, prefixes: prefixes ?? {}});
      }
    });
  });
}

async function convertQuadsToJsonLD(quads: N3.Quad[], prefixes: N3.Prefixes): Promise<any> {
  const nquads = await serializeQuadsToNQuads(quads);
  const jsonldDoc = await jsonld.fromRDF(nquads, {format: 'application/n-quads'});

  const context = buildContext(prefixes);
  if (Object.keys(context).length === 0) return jsonldDoc;

  return jsonld.compact(jsonldDoc, context);
}

function serializeQuadsToNQuads(quads: N3.Quad[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new N3.Writer({format: 'N-Quads'});
    quads.forEach(quad => writer.addQuad(quad));
    writer.end((error: any, result: any) => (error ? reject(error) : resolve(result)));
  });
}

function buildContext(prefixes: N3.Prefixes): Record<string, string> {
  return Object.fromEntries(
    Object.entries(prefixes).filter(([prefix]) => Boolean(prefix))
  ) as Record<string, string>;
}
