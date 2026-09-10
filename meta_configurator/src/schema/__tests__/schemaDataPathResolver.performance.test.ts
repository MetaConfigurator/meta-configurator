import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generate} from 'json-schema-faker';
import {describe, expect, it} from 'vitest';
import type {Path} from '@/utility/path';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {SchemaDataPathResolver} from '@/schema/schemaDataPathResolver';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const enzymeMlSchemaPath = path.resolve(
  dirname,
  '../../../../documentation_user/examples/schema_selection_list/enzymeMl.schema.json'
);

function measureMedian<T>(task: () => T): {result: T; milliseconds: number} {
  const durations: number[] = [];
  let result!: T;

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const startedAt = performance.now();
    result = task();
    durations.push(performance.now() - startedAt);
  }

  durations.sort((left, right) => left - right);
  return {
    result,
    milliseconds: Math.round(durations[Math.floor(durations.length / 2)]! * 100) / 100,
  };
}

describe('SchemaDataPathResolver performance', () => {
  it('reports representative EnzymeML lookup costs', async () => {
    const schema = JSON.parse(fs.readFileSync(enzymeMlSchemaPath, 'utf8')) as TopLevelSchema;
    const data = await generate(schema, {
      alwaysFakeOptionals: true,
      minItems: 3,
      failOnInvalidTypes: false,
    });
    const exampleSchemaPaths: Path[] = [
      ['definitions', 'Creator'],
      ['definitions', 'Reaction'],
      ['definitions', 'KineticParameter'],
    ];
    const exampleDataPaths: Path[] = [
      ['creators', 0, 'given_name'],
      ['reactions', 0, 'name'],
      ['measurements', 0, 'temperature'],
    ];

    const exampleReverseMeasurement = measureMedian(() => {
      const resolver = new SchemaDataPathResolver(schema);
      return exampleSchemaPaths.map(schemaPath =>
        resolver.findDataPathsUsingSchema(schemaPath, data)
      );
    });
    const allReverseMeasurement = measureMedian(() =>
      new SchemaDataPathResolver(schema).mapSchemaPathsToDataPaths(data)
    );
    const exampleForwardMeasurement = measureMedian(() => {
      const resolver = new SchemaDataPathResolver(schema);
      return exampleDataPaths.map(dataPath => resolver.findSchemaPathsForDataPath(dataPath, data));
    });

    const timings = {
      schemaBytes: Buffer.byteLength(JSON.stringify(schema)),
      dataBytes: Buffer.byteLength(JSON.stringify(data)),
      schemaPathCount: allReverseMeasurement.result.length,
      schemaDataAssociationCount: allReverseMeasurement.result.reduce(
        (count, match) => count + match.dataPaths.length,
        0
      ),
      exampleSchemaPathsMedianMilliseconds: exampleReverseMeasurement.milliseconds,
      allSchemaPathsMedianMilliseconds: allReverseMeasurement.milliseconds,
      exampleDataPathsMedianMilliseconds: exampleForwardMeasurement.milliseconds,
    };
    console.info('SchemaDataPathResolver EnzymeML benchmark:', timings);

    expect(exampleReverseMeasurement.result.every(paths => paths.length > 0)).toBe(true);
    expect(exampleForwardMeasurement.result.every(paths => paths.length > 0)).toBe(true);
    expect(allReverseMeasurement.result.length).toBeGreaterThan(100);
    // A broad guard catches accidental explosive behavior without making CI hardware a benchmark.
    expect(
      Math.max(
        exampleReverseMeasurement.milliseconds,
        allReverseMeasurement.milliseconds,
        exampleForwardMeasurement.milliseconds
      )
    ).toBeLessThan(5000);
  }, 15_000);
});
