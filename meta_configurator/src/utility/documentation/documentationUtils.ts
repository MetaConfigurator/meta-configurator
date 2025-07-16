import type {JsonSchemaObjectType, TopLevelSchema} from '@/schema/jsonSchemaType';
import {collectReferences, findTargetPath, resolveReferences} from '@/schema/resolveReferences';
import type {Path} from '@/utility/path';
import {pathToAscii} from '@/utility/pathUtils';
import {formatRegistry} from '@/dataformats/formatRegistry';
import {mergeAllOfs} from '@/schema/mergeAllOfs';

const CONSTRAINTS_KEYS = [
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'pattern',
  'format',
  'const',
  'multipleOf',
];

export function shouldIncludeNodeInDocumentation(propertyName: string) {
  if (['if', 'then', 'else'].includes(propertyName.toLowerCase())) {
    return false;
  }

  return true;
}

export function hasConstraints(schema: any): boolean {
  if (!schema) return false;
  for (const key of CONSTRAINTS_KEYS) {
    if (key in schema) {
      return true;
    }
  }
  return false;
}

export function hasExample(schema: any): boolean {
  return schema && Array.isArray(schema.examples) && schema.examples.length > 0;
}

export function hasDefault(schema: any): boolean {
  return schema && schema.default;
}

export function getExampleValues(schema: any): any[] {
  if (schema.examples && schema.examples.length > 0) {
    return schema.examples;
  }
  return [];
}

export function generateSchemaInstance(
  schema: any,
  rootSchema: TopLevelSchema,
  visitedReferences: Set<string> | undefined = undefined
): any {
  if (!schema) {
    return undefined;
  }
  // if the schema has example values, take the first example
  if (schema.examples && schema.examples.length > 0) {
    return schema.examples[0];
  }

  // otherwise, if the schema has a default, also take it
  if (schema.defaults && schema.defaults.length > 0) {
    return schema.defaults[0];
  }

  // if there is a constant value defined, take it
  if (schema.const) {
    return schema.const;
  }
  // if there is an enum with a single value, take it
  if (schema.enum && schema.enum.length === 1) {
    return schema.enum[0];
  }

  if (schema.oneOf) {
    schema = mergeAllOfs({
      allOf: [schema, schema.oneOf[0]],
    });
  }
  if (schema.anyOf) {
    schema = mergeAllOfs({
      allOf: [schema, schema.anyOf[0]],
    });
  }

  if (visitedReferences == undefined) {
    visitedReferences = new Set();
  }
  // mark the current schema as visited so children will not visit it again if not required
  visitedReferences = new Set([...visitedReferences, ...collectReferences(schema, rootSchema)]);

  // resolve the references of the current schema if needed
  const resolvedSchema: JsonSchemaObjectType = resolveReferences(schema, rootSchema);

  const type = resolvedSchema?.type ?? 'any';
  if (type === 'string') return '{string}';
  if (type === 'number') return '{number}';
  if (type === 'integer') return '{integer}';
  if (type === 'boolean') return '{boolean}';
  if (type === 'array') {
    const itemsReferences = collectReferences(resolvedSchema.items, rootSchema);
    const itemsRefIsNotAlreadyVisited = isDisjoint(itemsReferences, visitedReferences);
    if (itemsRefIsNotAlreadyVisited) {
      const arrayItemInstance = generateSchemaInstance(
        resolvedSchema.items,
        rootSchema,
        visitedReferences
      );
      const itemCount = Math.max(schema.minItems || 0, 1);
      const resultArray: any[] = [];
      for (let i = 0; i < itemCount; i++) {
        resultArray.push(arrayItemInstance);
      }
      return resultArray as any;
    }
  }
  if (type === 'object') {
    const props = resolvedSchema.properties ?? {};
    const patternProps = resolvedSchema.patternProperties ?? {};
    const additionalProps = resolvedSchema.additionalProperties ?? true;
    const result: any = {};
    for (const key in props) {
      const propertySchema = props[key];
      const propertyReferences = collectReferences(propertySchema, rootSchema);
      const propertyRefIsNotAlreadyVisited = isDisjoint(propertyReferences, visitedReferences);
      if (propertyRefIsNotAlreadyVisited)
        result[key] = generateSchemaInstance(propertySchema, rootSchema, visitedReferences);
    }
    for (const key in patternProps) {
      const propertySchema = patternProps[key];
      const propertyReferences = collectReferences(propertySchema, rootSchema);
      const propertyRefIsNotAlreadyVisited = isDisjoint(propertyReferences, visitedReferences);
      if (propertyRefIsNotAlreadyVisited)
        result[key] = generateSchemaInstance(propertySchema, rootSchema, visitedReferences);
    }
    if (additionalProps && additionalProps != true) {
      result['additionalProp'] = generateSchemaInstance(
        additionalProps,
        rootSchema,
        visitedReferences
      );
    }
    return result;
  }
  return '{value}';
}

export function extractConstraints(schema: any): string {
  if (!schema) return '-';
  const constraints: string[] = [];
  for (const key of CONSTRAINTS_KEYS) {
    if (key in schema) {
      constraints.push(`${key}: ${JSON.stringify(schema[key])}`);
    }
  }
  const deprecated = schema.deprecated == true;

  if (deprecated) {
    return constraints.length ? constraints.join(', ') + '. Deprecated.' : 'Deprecated.';
  } else {
    return constraints.length ? constraints.join(', ') : '-';
  }
}

export function toAnchorLink(label: string, nodePath: Path, rootSchema: TopLevelSchema): string {
  return `[${label}](#${toAnchor(nodePath, rootSchema)})`;
}

export function toAnchorId(
  label: string,
  nodePath: Path,
  rootSchema: TopLevelSchema,
  selfReferring: boolean = false
): string {
  if (!selfReferring) {
    return `<a id="${toAnchor(nodePath, rootSchema)}"></a>${label}`;
  } else {
    const anchor = toAnchor(nodePath, rootSchema);
    return `<a id="${anchor}"></a>[${label}](#${anchor})`;
  }
}

export function toAnchor(nodePath: Path, rootSchema: TopLevelSchema): string {
  if (nodePath.length === 0) {
    return 'root';
  }
  const resolvedPath = findTargetPath(nodePath, rootSchema, true);
  return pathToAscii(resolvedPath);
}

export function escapeMarkdown(text: string | undefined | null): string {
  if (!text) return '-';
  return text
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/([|_*[\]()#+\-!`>])/g, '\\$1') // Escape Markdown symbols including |
    .replace(/</g, '&lt;') // Escape angle brackets
    .replace(/>/g, '&gt;') // Escape angle brackets
    .trim();
}

export function formatDocumentExample(data: any, dataFormat: string): string {
  const formatDef = formatRegistry.getFormat(dataFormat);
  return formatDef.dataConverter.stringify(data);
}

export function cleanMarkdownContent(markdown: string): string {
  // Remove HTML tags but keep inner text (e.g., remove <div>, <span>, <a id="...">)
  return markdown
    .replace(/<a\s+id="[^"]*"><\/a>/g, '') // anchor IDs
    .replace(/<[^>]+>/g, '') // all other tags
    .replace(/&nbsp;/g, ' ') // replace non-breaking spaces
    .replace(/\r\n/g, '\n'); // normalize line endings
}

// we implement this function ourselves as the built-in Set.isDisjoint is not available in all environments
function isDisjoint(setA: Set<any>, setB: Set<any>): boolean {
  for (const item of setA) {
    if (setB.has(item)) return false;
  }
  return true;
}
