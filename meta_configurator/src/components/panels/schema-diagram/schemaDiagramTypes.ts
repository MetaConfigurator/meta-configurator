import type {Path} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';
import {MarkerType} from '@vue-flow/core';
import type {JsonSchemaObjectType} from '@/schema/jsonSchemaType';
import {pathsToEdgeId, pathToNodeId} from '@/components/panels/schema-diagram/schemaDiagramHelper';
import {isDarkMode} from '@/utility/darkModeUtils';

export class SchemaGraph {
  public constructor(public nodes: SchemaNodeData[], public edges: EdgeData[]) {}

  public findNode(path: Path | string): SchemaElementData | undefined {
    if (typeof path !== 'string') {
      path = pathToString(path);
    }
    return this.nodes.find(node => pathToString(node.absolutePath) === path);
  }

  private toVueFlowNodes(): Node[] {
    return this.nodes.map(data => {
      return {
        id: pathToNodeId(data.absolutePath),
        position: {x: Math.random() * 500, y: Math.random() * 500},
        label: data.name,
        type: data.getNodeType(),
        data: data,
      };
    });
  }

  private toVueFlowEdges(individualAttributeHandles: boolean): Edge[] {
    return this.edges.map(data => {
      let type = 'default';
      let color = isDarkMode.value ? 'white' : 'black';
      const markerEnd = MarkerType.Arrow;
      const sourceHandle = individualAttributeHandles ? data.startHandle : null;
      const label = data.isArray ? data.label + '[]' : data.label;

      switch (data.edgeType) {
        case EdgeType.ATTRIBUTE:
          break;
        case EdgeType.ALL_OF:
          color = 'seagreen';
          break;
        case EdgeType.ANY_OF:
          color = 'seagreen';
          break;
        case EdgeType.ONE_OF:
          color = 'seagreen';
          break;
        case EdgeType.IF:
          type = 'straight';
          color = 'indianred';
          break;
        case EdgeType.THEN:
          type = 'straight';
          color = 'indianred';
          break;
        case EdgeType.ELSE:
          type = 'straight';
          color = 'indianred';
          break;
      }

      return {
        id: pathsToEdgeId(data.start.absolutePath, data.end.absolutePath, data.label, data.isArray),
        source: pathToNodeId(data.start.absolutePath),
        target: pathToNodeId(data.end.absolutePath),
        sourceHandle: sourceHandle ? sourceHandle : 'main',
        type: type,
        label: label,
        data: data,
        markerEnd: markerEnd,
        animated: false,
        style: {stroke: color, 'stroke-width': 1.5},
      };
    });
  }

  public toVueFlowGraph(individualAttributeEdges: boolean): VueFlowGraph {
    const nodes = this.toVueFlowNodes();
    const edges = this.toVueFlowEdges(individualAttributeEdges);
    return new VueFlowGraph(nodes, edges);
  }
}

export class VueFlowGraph {
  public constructor(public nodes: Node[], public edges: Edge[]) {}
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
    public name: string,
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
    name: string,
    hasUserDefinedName: boolean,
    absolutePath: Path,
    schema: JsonSchemaObjectType
  ) {
    super(name, hasUserDefinedName, absolutePath, schema);
  }
}

export class SchemaObjectNodeData extends SchemaNodeData {
  public constructor(
    name: string,
    hasUserDefinedName: boolean,
    absolutePath: Path,
    schema: JsonSchemaObjectType,
    public attributes: SchemaObjectAttributeData[]
  ) {
    super(name, hasUserDefinedName, absolutePath, schema);
  }

  public getNodeType() {
    return 'schemaobject';
  }
}

export class SchemaEnumNodeData extends SchemaNodeData {
  public constructor(
    public name: string,
    public hasUserDefinedName: boolean,
    public absolutePath: Path,
    public schema: JsonSchemaObjectType,
    public values: string[]
  ) {
    super(name, hasUserDefinedName, absolutePath, schema);
  }
  public getNodeType() {
    return 'schemaenum';
  }
}

export class SchemaObjectAttributeData extends SchemaElementData {
  public constructor(
    name: string,
    public typeDescription: string,
    public propertyType: 'properties' | 'patternProperties',
    absolutePath: Path,
    public deprecated: boolean,
    public required: boolean,
    public index: number,
    schema: JsonSchemaObjectType
  ) {
    super(name, true, absolutePath, schema);
  }
}

export class EdgeData {
  public constructor(
    public start: SchemaNodeData,
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
