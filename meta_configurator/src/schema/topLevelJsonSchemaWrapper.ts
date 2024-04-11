import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {TopLevelSchema} from '@/model/jsonSchemaType';

/**
 * Like {@link JsonSchemaWrapper}, but with additional properties that are only allowed at the top level of a schema.
 */
export class TopLevelJsonSchemaWrapper extends JsonSchemaWrapper {
  private readonly _$schema?: string;
  private _$id?: string;
  private _$vocabulary?: Record<string, boolean>;
  private _$defs?: Record<string, JsonSchemaWrapper>;

  constructor(schema: TopLevelSchema) {
    super(schema, schema);
    this._$schema = schema.$schema;
  }

  get $schema(): string | undefined {
    return this._$schema;
  }

  get $id(): string | undefined {
    return this._$id;
  }

  get $vocabulary(): Record<string, boolean> | undefined {
    return this._$vocabulary;
  }

  get $defs(): Record<string, JsonSchemaWrapper> | undefined {
    return this._$defs;
  }
}
