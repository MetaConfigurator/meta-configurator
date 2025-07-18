import {describe, expect, it, vi} from 'vitest';
import {readdir, readFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {schemaToMarkdown} from '@/utility/documentation/schemaToMarkdown';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {cleanMarkdownContent} from '@/utility/documentation/documentationUtils';
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';
import {constructSchemaGraph} from '@/schema/graph-representation/schemaGraphConstructor';
import {useSettings} from '@/settings/useSettings';

// resolve current directory since __dirname is not available in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// directory containing input / expected pairs
const CASE_DIR = join(__dirname, 'samples');

async function loadCases() {
  const files = await readdir(CASE_DIR);
  const cases: {name: string; schemaPath: string; mdPath: string}[] = [];

  for (const file of files) {
    if (file.endsWith('.schema.json')) {
      const base = file.replace(/\.schema\.json$/, '');
      const mdFile = `${base}.expected.md`;
      if (files.includes(mdFile)) {
        cases.push({
          name: base,
          schemaPath: join(CASE_DIR, file),
          mdPath: join(CASE_DIR, mdFile),
        });
      }
    }
  }
  return cases;
}

vi.mock('@/dataformats/formatRegistry', () => {
  const dataConverter = {
    stringify: (d: any) => JSON.stringify(d, null, 2),
    parse: (s: string) => JSON.parse(s),
  };

  return {
    useDataConverter: () => dataConverter,

    formatRegistry: {
      getFormat: vi.fn().mockReturnValue({dataConverter}),
    },
  };
});

describe('schemaToMarkdown samples coverage', async () => {
  const cases = await loadCases();

  // generate one <it> per case for nice reporting
  for (const c of cases) {
    it(`converts ${c.name} correctly`, async () => {
      const [schemaJson, expectedMd] = await Promise.all([
        readFile(c.schemaPath, 'utf8'),
        readFile(c.mdPath, 'utf8'),
      ]);

      const schema: TopLevelSchema = JSON.parse(schemaJson);
      const schemaPreprocessed = preprocessOneTime(schema);
      const title = schemaPreprocessed.title ?? 'Untitled schema';
      const schemaGraph = constructSchemaGraph(
        schemaPreprocessed,
        useSettings().value.documentation.mergeAllOfs
      );
      const actualMd = cleanMarkdownContent(
        schemaToMarkdown(schemaPreprocessed, title, schemaGraph).trimEnd()
      );
      const expected = cleanMarkdownContent(expectedMd.trimEnd()); // ignore trailing newline diffs

      expect(actualMd).toBe(expected);
    });
  }
});
