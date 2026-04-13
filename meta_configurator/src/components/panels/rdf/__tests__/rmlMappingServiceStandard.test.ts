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
});
