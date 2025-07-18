import {
  constructSchemaGraph,
  nodesToObjectDefs,
  resolveEdgeTarget,
} from '@/schema/graph-representation/schemaGraphConstructor';
import {
  type SchemaObjectNodeData,
  type SchemaObjectAttributeData,
  type SchemaEnumNodeData,
  SchemaGraph,
  SchemaNodeData,
} from '@/schema/graph-representation/schemaGraphTypes';
import type {JsonSchemaObjectType, TopLevelSchema} from '@/schema/jsonSchemaType';
import {resolveReferences} from '@/schema/resolveReferences';
import {hasOutgoingEdge} from '@/schema/graph-representation/graphUtils';
import {
  escapeMarkdown,
  extractConstraints,
  formatDocumentExample,
  generateSchemaInstance,
  getExampleValues,
  hasConstraints,
  hasDefault,
  hasExample,
  shouldIncludeNodeInDocumentation,
  toAnchor,
  toAnchorId,
  toAnchorLink,
} from '@/utility/documentation/documentationUtils';
import {useSettings} from '@/settings/useSettings';
import {
  flattenHierarchy,
  graphRepresentationToHierarchy,
  type HierarchyNode,
} from '@/schema/graph-representation/graphRepresentationToHierarchy';

export function schemaToMarkdown(
  rootSchema: TopLevelSchema,
  schemaTitle: string,
  graph: SchemaGraph
) {
  const hierarchy = graphRepresentationToHierarchy(graph, true);
  const repeatEntries =
    useSettings().value.documentation.repeatMultipleOccurrencesInTableOfContents;

  if (!hierarchy.graphNode) {
    return 'No schema elements found.';
  }

  const flattenedHierarchy = flattenHierarchy(hierarchy);
  const md: string[] = [];

  md.push(`# ${schemaTitle}`);

  writeTableOfContents(md, flattenedHierarchy, rootSchema, repeatEntries);
  // do never repeat entries in the main content as this would bloat the document and also because currently anchors would always lead to the first occurrence
  writeContents(md, graph, flattenedHierarchy, rootSchema, false);
  return md.join('\n');
}

function writeTableOfContents(
  md: string[],
  flattenedHierarchy: HierarchyNode[],
  rootSchema: TopLevelSchema,
  repeatEntries: boolean
) {
  md.push(`### Table of Contents`);
  md.push(''); // Ensure proper Markdown block separation

  const usedAnchors = new Set<string>();
  const tocLines: string[] = [];

  flattenedHierarchy.forEach(hierarchyNode => {
    const node = hierarchyNode.graphNode;
    if (!['schemaobject', 'schemaenum'].includes(node.getNodeType())) return;

    const rawName = node.title ?? node.fallbackDisplayName;
    const name = escapeMarkdown(rawName);
    const anchor = toAnchor(node.absolutePath, rootSchema);

    if (!shouldIncludeNodeInDocumentation(name) || (!repeatEntries && usedAnchors.has(anchor)))
      return;

    const depth = hierarchyNode.depth;
    const indent = '    '.repeat(depth); // Markdown nested list indentation
    tocLines.push(`${indent}- ${toAnchorLink(name, node.absolutePath, rootSchema)}`);

    usedAnchors.add(anchor);
  });

  // Only push if there are actual TOC entries
  if (tocLines.length > 0) {
    md.push(...tocLines);
    md.push(''); // Ensure spacing after list
  }
}

function writeContents(
  md: string[],
  graph: SchemaGraph,
  flattenedHierarchy: HierarchyNode[],
  rootSchema: TopLevelSchema,
  repeatEntries: boolean
) {
  const usedAnchors = new Set<string>();

  flattenedHierarchy.forEach(hierarchyNode => {
    const node = hierarchyNode.graphNode;

    const nodeType = node.getNodeType();
    // write down only schema objects or enums
    if (!['schemaobject', 'schemaenum'].includes(nodeType)) return;

    const rawName = node.title ?? node.fallbackDisplayName;
    const name = escapeMarkdown(rawName);
    const description = node.schema.description ?? '';
    const anchor = toAnchor(node.absolutePath, rootSchema);

    if (!shouldIncludeNodeInDocumentation(name) || (!repeatEntries && usedAnchors.has(anchor)))
      return;

    md.push('---');
    md.push(`### ${toAnchorId(name, node.absolutePath, rootSchema, true)}`);
    usedAnchors.add(anchor);

    if (description) md.push(`*${description}*\n`);

    if (nodeType === 'schemaobject') {
      writeObjectNode(md, graph, rootSchema, node as SchemaObjectNodeData);
    }

    if (nodeType === 'schemaenum') {
      writeEnumNode(md, node as SchemaEnumNodeData);
    }
  });
}

function writeObjectNode(
  md: string[],
  graph: SchemaGraph,
  rootSchema: TopLevelSchema,
  node: SchemaObjectNodeData
) {
  const attributes = node.attributes ?? [];
  const hasAnyExample =
    attributes.some(attr => hasExample(attr.schema)) ||
    hasExample(node.schema.additionalProperties);
  const hasAnyDefault =
    attributes.some(attr => hasDefault(attr.schema)) ||
    hasDefault(node.schema.additionalProperties);
  const hasAnyConstraints =
    attributes.some(attr => hasConstraints(attr.schema)) ||
    hasConstraints(node.schema.additionalProperties);

  if (
    attributes.length > 0 ||
    node.schema.patternProperties?.length ||
    node.schema.additionalProperties
  ) {
    md.push('#### Properties\n');

    const header = ['Name', 'Type', 'Required', 'Description'];
    if (hasAnyConstraints) header.push('Constraints');
    if (hasAnyExample) header.push('Examples');
    if (hasAnyDefault) header.push('Default');

    md.push(`| ${header.join(' | ')} |`);
    md.push(`|${header.map(() => '------').join('|')}|`);

    attributes.forEach((attr: SchemaObjectAttributeData) => {
      const attributeName = attr.name ?? '-';
      let type = attr.typeDescription ?? '-';
      writeObjectAttribute(
        md,
        attributeName,
        type,
        attr.required,
        attr.schema,
        attr,
        graph,
        rootSchema,
        hasAnyExample,
        hasAnyDefault,
        hasAnyConstraints
      );
    });

    if (node.schema.additionalProperties) {
      const objectDefs = nodesToObjectDefs(graph.nodes);
      const edgeTargetResult = resolveEdgeTarget(
        node.schema.additionalProperties,
        [...node.absolutePath, 'additionalProperties'],
        objectDefs
      );
      const edgeTarget = edgeTargetResult[0];
      if (edgeTarget) {
        const type = edgeTarget.title || edgeTarget.fallbackDisplayName;
        writeObjectAttribute(
          md,
          '{string}',
          type,
          false,
          edgeTarget.schema,
          edgeTarget,
          graph,
          rootSchema,
          hasAnyExample,
          hasAnyDefault,
          hasAnyConstraints
        );
      }
    }

    md.push('');
  }

  const compositionKeywords = ['oneOf', 'anyOf', 'allOf'];
  compositionKeywords.forEach(keyword => {
    if (node.schema[keyword]) {
      md.push(`#### ${keyword}`);
      const compositionOptions: any[] = node.schema[keyword];
      // create a list in markdown with the different options to select from.
      // iterate through options with index because index is needed to create the absolute path of the option
      for (let optionIndex = 0; optionIndex < compositionOptions.length; optionIndex++) {
        md.push(`<b>Option ${optionIndex + 1}</b>`);

        const optionPath = [...node.absolutePath, keyword, optionIndex];
        let optionNode = graph.findNode(optionPath);

        const resolvedOptionTarget = resolveEdgeTarget(
          compositionOptions[optionIndex],
          optionPath,
          nodesToObjectDefs(graph.nodes)
        )[0];
        if (resolvedOptionTarget) {
          optionNode = resolvedOptionTarget;
        }

        if (optionNode) {
          const title = optionNode.title ?? optionNode.fallbackDisplayName;
          md.push(`##### <u>${toAnchorLink(title, optionPath, rootSchema)}</u>`);
        } else {
          md.push('```' + useSettings().value.dataFormat);
          md.push(
            formatDocumentExample(compositionOptions[optionIndex], useSettings().value.dataFormat)
          );
          md.push('```');
        }
      }
    }
  });

  const combinators = ['if', 'then', 'else', 'not', 'dependentSchemas'];
  const containsCombinator = combinators.some(keyword => node.schema[keyword] !== undefined);
  if (containsCombinator) {
    md.push(`<details>`);
    md.push(`<summary>Conditionals</summary>`);

    combinators.forEach(keyword => {
      if (node.schema[keyword]) {
        md.push(`#### ${keyword}`);
        const content = formatDocumentExample(node.schema[keyword], useSettings().value.dataFormat);
        md.push('```' + useSettings().value.dataFormat + '\n' + content + '\n```\n');
      }
    });

    md.push(`</details>`);
  }

  const instance = generateSchemaInstance(resolveReferences(node.schema, rootSchema), rootSchema);
  if (instance) {
    md.push('#### Example\n');
    md.push('```' + useSettings().value.dataFormat);
    md.push(formatDocumentExample(instance, useSettings().value.dataFormat));
    md.push('```');
  }
}

function writeObjectAttribute(
  md: string[],
  propertyName: string,
  propertyTypeDescription: string,
  required: boolean,
  propertySchema: JsonSchemaObjectType,
  nodeData: SchemaNodeData,
  graph: SchemaGraph,
  rootSchema: TopLevelSchema,
  tableIncludesExamples: boolean,
  tableIncludesDefaults: boolean,
  tableIncludesConstraints: boolean
) {
  let attributeName = escapeMarkdown(propertyName);
  let type = escapeMarkdown(propertyTypeDescription);
  const requiredDesc = required
    ? '<span style="color:lightblue">true</span>'
    : '<span style="color:salmon">false</span>';
  let description = escapeMarkdown(propertySchema.description ?? '-');

  if (hasOutgoingEdge(nodeData, graph)) {
    type = `<u>${toAnchorLink(type, nodeData.absolutePath, rootSchema)}</u>`;
  } else {
    // no outgoing edge, so it is not a reference to another schema.
    // this means we can give it its own id
    attributeName = toAnchorId(attributeName, nodeData.absolutePath, rootSchema);
  }
  const row = [attributeName, type, requiredDesc, description];
  if (tableIncludesConstraints) {
    const constraints = escapeMarkdown(extractConstraints(propertySchema));
    row.push(constraints);
  }
  if (tableIncludesExamples) {
    if (hasExample(propertySchema)) {
      const examples =
        getExampleValues(propertySchema)
          .map(example => {
            return formatDocumentExample(example, useSettings().value.dataFormat);
          })
          .join(', ') || '-';
      row.push(escapeMarkdown(examples));
    } else {
      row.push('-');
    }
  }
  if (tableIncludesDefaults) {
    if (hasDefault(propertySchema)) {
      const def = formatDocumentExample(propertySchema.default, useSettings().value.dataFormat);
      row.push(escapeMarkdown(def));
    } else {
      row.push('-');
    }
  }
  md.push(`| ${row.join(' | ')} |`);
}

function writeEnumNode(md: string[], node: SchemaEnumNodeData) {
  const enumNode = node as SchemaEnumNodeData;
  const hideInSpoiler =
    node.values.length > useSettings().value.documentation.enumMaxCountToShowWithoutSpoiler;

  if (hideInSpoiler) {
    md.push(`<details>`);
    md.push(`<summary>Enumeration Values</summary>`);
  } else {
    md.push(`#### Enumeration Values`);
  }

  enumNode.values.forEach(val => {
    md.push(`- \`${String(val)}\``);
  });

  if (hideInSpoiler) {
    md.push(`</details>`);
  }

  md.push('');
}
