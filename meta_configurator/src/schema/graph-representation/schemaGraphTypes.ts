import type {Path} from '@/utility/path';
import type {JsonSchemaObjectType} from '@/schema/jsonSchemaType';
import {pathToString} from '@/utility/pathUtils';

export class SchemaGraph {
  public constructor(public nodes: SchemaNodeData[], public edges: EdgeData[]) {}

  public findNode(path: Path | string): SchemaElementData | undefined {
    if (typeof path !== 'string') {
      path = pathToString(path);
    }
    return this.nodes.find(node => pathToString(node.absolutePath) === path);
  }
}

export interface Node {
  id: string;
  position: {x: number; y: number};
  label: string;
  type: string;
  data: SchemaElementData;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  data: EdgeData;
  animated: boolean;
}

export class SchemaElementData {
  public constructor(
    public name: string | undefined,
    public title: string | undefined,
    public fallbackDisplayName: string,
    public hasUserDefinedName: boolean,
    public absolutePath: Path,
    public schema: JsonSchemaObjectType
  ) {}

  public getNodeType() {
    return 'undefined';
  }
}

export class SchemaNodeData extends SchemaElementData {
  public constructor(
    name: string | undefined,
    title: string | undefined,
    fallbackDisplayName: string,
    hasUserDefinedName: boolean,
    absolutePath: Path,
    schema: JsonSchemaObjectType
  ) {
    super(name, title, fallbackDisplayName, hasUserDefinedName, absolutePath, schema);
  }
}

export class SchemaObjectNodeData extends SchemaNodeData {
  public constructor(
    name: string | undefined,
    title: string | undefined,
    fallbackDisplayName: string,
    hasUserDefinedName: boolean,
    absolutePath: Path,
    schema: JsonSchemaObjectType,
    public attributes: SchemaObjectAttributeData[]
  ) {
    super(name, title, fallbackDisplayName, hasUserDefinedName, absolutePath, schema);
  }

  public getNodeType() {
    return 'schemaobject';
  }
}

export class SchemaEnumNodeData extends SchemaNodeData {
  public constructor(
    name: string | undefined,
    title: string | undefined,
    fallbackDisplayName: string,
    public hasUserDefinedName: boolean,
    public absolutePath: Path,
    public schema: JsonSchemaObjectType,
    public values: string[]
  ) {
    super(name, title, fallbackDisplayName, hasUserDefinedName, absolutePath, schema);
  }
  public getNodeType() {
    return 'schemaenum';
  }
}

export class SchemaObjectAttributeData extends SchemaElementData {
  public constructor(
    public name: string,
    public typeDescription: string,
    public propertyType: 'properties' | 'patternProperties',
    absolutePath: Path,
    public deprecated: boolean,
    public required: boolean,
    public index: number,
    schema: JsonSchemaObjectType
  ) {
    super(name, undefined, name, true, absolutePath, schema);
  }
}

export class EdgeData {
  public constructor(
    public start: SchemaNodeData,
    // can be schema of the start node or also sub schema/attribute schema of it
    public startSchemaPath: Path,
    public startHandle: string | null,
    public end: SchemaNodeData,
    public edgeType: EdgeType,
    public isArray: boolean,
    public label: string
  ) {}
}

export enum EdgeType {
  ATTRIBUTE = 'attribute',
  ALL_OF = 'allOf',
  ANY_OF = 'anyOf',
  ONE_OF = 'oneOf',
  IF = 'if',
  THEN = 'then',
  ELSE = 'else',
  ADDITIONAL_PROPERTIES = 'additionalProperties',
  PATTERN_PROPERTIES = 'patternProperties',
}
