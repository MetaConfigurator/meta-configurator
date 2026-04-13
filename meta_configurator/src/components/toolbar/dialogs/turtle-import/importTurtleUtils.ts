import {useFileDialog} from '@vueuse/core';
import {readFileContentToStringRef} from '@/utility/readFileContent';
import {RdfMediaType} from '@/components/panels/rdf/rdfEnums';
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
 * @returns Promise resolving to a compacted JSON-LD object
 */
export async function turtleToJsonLD(turtleString: string): Promise<any> {
  const {quads, prefixes} = await parseTurtle(turtleString);
  const nquads = await serializeToNQuads(quads);
  const expanded = await jsonld.fromRDF(nquads, {format: RdfMediaType.NQuads});
  const context = buildContext(prefixes);
  return Object.keys(context).length > 0 ? jsonld.compact(expanded, context) : expanded;
}

function parseTurtle(turtleString: string): Promise<{quads: N3.Quad[]; prefixes: N3.Prefixes}> {
  return new Promise((resolve, reject) => {
    const quads: N3.Quad[] = [];
    new N3.Parser().parse(turtleString, (error, quad, prefixes) => {
      if (error) reject(error);
      else if (quad) quads.push(quad);
      else resolve({quads, prefixes: prefixes ?? {}});
    });
  });
}

function serializeToNQuads(quads: N3.Quad[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new N3.Writer({format: 'N-Quads'});
    quads.forEach(q => writer.addQuad(q));
    writer.end((error, result) => (error ? reject(error) : resolve(result)));
  });
}

function buildContext(prefixes: N3.Prefixes): Record<string, N3.NamedNode<string>> {
  return Object.fromEntries(
    Object.entries(prefixes).filter(([prefix]) => Boolean(prefix))
  ) as Record<string, N3.NamedNode<string>>;
}
