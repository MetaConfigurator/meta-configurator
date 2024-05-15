import type {Path} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';
import {useLayout} from '@/components/panels/schema-diagram/useLayout';
import {MarkerType} from '@vue-flow/core';
import type {JsonSchemaObjectType} from '@/schema/jsonSchemaType';

export class SchemaGraph {
  public constructor(public nodes: SchemaElementData[], public edges: EdgeData[]) {}

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

  private toVueFlowEdges(): Edge[] {
    return this.edges.map(data => {
      let type = 'default';
      let color = 'black';
      const markerEnd = MarkerType.Arrow;

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
        id: pathsToEdgeId(data.start.absolutePath, data.end.absolutePath),
        source: pathToNodeId(data.start.absolutePath),
        target: pathToNodeId(data.end.absolutePath),
        type: type,
        label: data.label,
        data: data,
        markerEnd: markerEnd,
        animated: false,
        style: {stroke: color, 'stroke-width': 1.5},
      };
    });
  }

  public toVueFlowGraph(): VueFlowGraph {
    const nodes = this.toVueFlowNodes();
    const edges = this.toVueFlowEdges();
    return new VueFlowGraph(nodes, edges);
  }
}

export class VueFlowGraph {
  public constructor(public nodes: Node[], public edges: Edge[]) {}

  public updateLayout(direction: string) {
    this.nodes = useLayout().layout(this.nodes, this.edges, direction);
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

export function pathsToEdgeId(start: Path, end: Path): string {
  return '- ' + pathToNodeId(start) + ' - ' + pathToNodeId(end) + ' ->';
}

export function pathToNodeId(path: Path): string {
  if (path.length == 0) {
    return 'root';
  } else {
    return pathToString(path);
  }
}

export class SchemaElementData {
  public constructor(
    public name: string,
    public absolutePath: Path,
    public schema: JsonSchemaObjectType
  ) {}

  public getNodeType() {
    return 'undefined';
  }
}

export class SchemaNodeData extends SchemaElementData {
  public constructor(name: string, absolutePath: Path, schema: JsonSchemaObjectType) {
    super(name, absolutePath, schema);
  }
}

export class SchemaObjectNodeData extends SchemaNodeData {
  public constructor(
    name: string,
    absolutePath: Path,
    schema: JsonSchemaObjectType,
    public attributes: SchemaObjectAttributeData[]
  ) {
    super(name, absolutePath, schema);
  }

  public getNodeType() {
    return 'schemaobject';
  }
}

export class SchemaEnumNodeData extends SchemaNodeData {
  public constructor(
    public name: string,
    public absolutePath: Path,
    public schema: JsonSchemaObjectType,
    public values: string[]
  ) {
    super(name, absolutePath, schema);
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
    schema: JsonSchemaObjectType
  ) {
    super(name, absolutePath, schema);
  }
}

export class EdgeData {
  public constructor(
    public start: SchemaNodeData,
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
