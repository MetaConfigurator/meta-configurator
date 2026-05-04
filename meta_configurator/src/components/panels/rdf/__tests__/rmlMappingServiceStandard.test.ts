import {describe, expect, it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RmlMappingServiceStandard} from '@/rml-mapping/standard/rmlMappingServiceStandard';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(dirname, 'fixtures', 'rml-mapping');

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf-8');
}

describe('RmlMappingServiceStandard.performRmlMapping', () => {
  it('Reads JSON input and applies RML mapping, then matches expected JSON-LD', async () => {
    const input = JSON.parse(readFixture('input.json'));
    const mappingConfig = readFixture('mapping.ttl');
    const expectedResult = JSON.parse(readFixture('expected.json'));

    const service = new RmlMappingServiceStandard();
    const result = await service.performRmlMapping(input, mappingConfig);

    expect(result.success).toBe(true);
    expect(result.resultData).toEqual(expectedResult);
  });

  it('excludes rr/rml/ql prefixes from the JSON-LD @context', async () => {
    const input = JSON.parse(readFixture('input.json'));
    const mappingConfig = readFixture('mapping.ttl');

    const service = new RmlMappingServiceStandard();
    const result = await service.performRmlMapping(input, mappingConfig);

    expect(result.success).toBe(true);
    const context = result.resultData['@context'];
    expect(context).not.toHaveProperty('rr');
    expect(context).not.toHaveProperty('rml');
    expect(context).not.toHaveProperty('ql');
  });

  it('includes non-ignored prefixes in the JSON-LD @context', async () => {
    const input = JSON.parse(readFixture('input.json'));
    const mappingConfig = readFixture('mapping.ttl');

    const service = new RmlMappingServiceStandard();
    const result = await service.performRmlMapping(input, mappingConfig);

    expect(result.success).toBe(true);
    const context = result.resultData['@context'];
    expect(context).toHaveProperty('m4i', 'http://w3id.org/nfdi4ing/metadata4ing#');
    expect(context).toHaveProperty('schema', 'https://schema.org/');
    expect(context).toHaveProperty('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
  });
});
