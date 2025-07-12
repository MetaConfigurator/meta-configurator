import {
    constructSchemaGraph,
    nodesToObjectDefs,
    resolveEdgeTarget
} from "@/schema/graph-representation/schemaGraphConstructor";
import {
    type SchemaObjectNodeData,
    type SchemaObjectAttributeData,
    type SchemaEnumNodeData, SchemaGraph, SchemaNodeData
} from "@/schema/graph-representation/schemaGraphTypes";
import type {JsonSchemaObjectType, TopLevelSchema} from "@/schema/jsonSchemaType";
import { resolveReferences} from "@/schema/resolveReferences";
import {hasOutgoingEdge} from "@/schema/graph-representation/graphUtils";
import {
  escapeMarkdown,
  extractConstraints, formatDocumentExample,
  generateSchemaInstance, getDefaultValues,
  hasExample, shouldIncludeNodeInDocumentation,
  toAnchor,
} from '@/utility/documentation/documentationUtils';
import {useSettings} from "@/settings/useSettings";

const settings = useSettings();

export function schemaToMarkdown(rootSchema: TopLevelSchema) {
    const graph = constructSchemaGraph(rootSchema, true);
    const md: string[] = [];

    writeTableOfContents(md, graph, rootSchema);


    graph.nodes.forEach((node) => {
        const nodeType = node.getNodeType();
        // write down only schema objects or enums
        if (!["schemaobject", "schemaenum"].includes(nodeType)) return;

        const rawName = node.title ?? node.fallbackDisplayName;
        const name = escapeMarkdown(rawName);
        const anchor = toAnchor(node.absolutePath, rootSchema);
        const description = node.schema.description ?? "";

        if (!shouldIncludeNodeInDocumentation(name)) return;

        md.push("---");
        md.push(`### <a id="${anchor}"></a>${name}`);
        if (description) md.push(`*${description}*\n`);

        if (nodeType === "schemaobject") {
            writeObjectNode(md, graph, rootSchema, node as SchemaObjectNodeData);
        }

        if (nodeType === "schemaenum") {
            writeEnumNode(md, node as SchemaEnumNodeData);
        }
    });

    return md.join("\n");
}

function writeTableOfContents(md: string[], graph: SchemaGraph, rootSchema: TopLevelSchema) {
    md.push(`<div class="toc-wrapper">`);
    md.push(`<h3>Table of Contents</h3>`);

    const addedAnchors = new Set<string>();
    const tocLinks: string[] = [];

    // TODO: for future, it would be better if in table of contents the hierarchy of definitions is already shown
    // also, by building such a hierarchy, it is easier to determine which nodes to show and which to hide.
    // unconnected nodes or conditionals, etc. should be hidden

    graph.nodes.forEach((node) => {
        if (!["schemaobject", "schemaenum"].includes(node.getNodeType())) return;

        const rawName = node.title ?? node.fallbackDisplayName;
        const name = escapeMarkdown(rawName);
        const anchor = toAnchor(node.absolutePath, rootSchema);

        if (!shouldIncludeNodeInDocumentation(name)) return;

        if (!addedAnchors.has(anchor)) {
            tocLinks.push(`<a href="#${anchor}">${name}</a>`);
            addedAnchors.add(anchor);
        }
    });

    md.push(`<div class="toc-links">${tocLinks.join("<br>")}</div>`);
    md.push(`</div>`);
    md.push("");
}


function writeObjectNode(md: string[], graph: SchemaGraph, rootSchema: TopLevelSchema, node: SchemaObjectNodeData) {

    const attributes = node.attributes ?? [];
    const hasAnyExample = attributes.some(attr => hasExample(attr.schema));

    if (attributes.length > 0 || node.schema.patternProperties?.length || node.schema.additionalProperties) {
        md.push("#### Properties\n");

        const header = ["Name", "Type", "Required", "Description", "Default", "Constraints"];
        if (hasAnyExample) header.push("Example");

        md.push(`| ${header.join(" | ")} |`);
        md.push(`|${header.map(() => "------").join("|")}|`);

        attributes.forEach((attr: SchemaObjectAttributeData) => {
            const attributeName = attr.name ?? "-";
            let type = attr.typeDescription ?? "-";
            writeObjectAttribute(md, attributeName, type, attr.required, attr.schema, attr, graph, rootSchema, hasAnyExample);
        });


        if (node.schema.additionalProperties) {
            const objectDefs = nodesToObjectDefs(graph.nodes);
            const edgeTargetResult = resolveEdgeTarget(node, node.schema.additionalProperties, [...node.absolutePath, 'additionalProperties'], objectDefs)
            const edgeTarget = edgeTargetResult[0]
            if (edgeTarget) {
                const type = edgeTarget.title || edgeTarget.fallbackDisplayName;
                writeObjectAttribute(md, "{string}", type, false, edgeTarget.schema, edgeTarget, graph, rootSchema, hasAnyExample);
            }
        }


        md.push("");
    }

    const compositionKeywords = ["oneOf", "anyOf"] // allOf should not occur because we merge all allOfs!
    compositionKeywords.forEach((keyword) => {
        if (node.schema[keyword]) {
            md.push(`#### ${keyword}`);
            const compositionOptions: any[] = node.schema[keyword];
            // create a list in markdown with the different options to select from.
            // iterate through options with index because index is needed to create the absolute path of the option
            for (let optionIndex = 0; optionIndex < compositionOptions.length; optionIndex++) {
                const optionPath = [...node.absolutePath, keyword, optionIndex]
                const optionNode = graph.findNode(optionPath)
                if (optionNode) {
                    const title = optionNode.title ?? optionNode.fallbackDisplayName;
                    const anchor = toAnchor(optionPath, rootSchema);
                    md.push(`- <u>[${title}](#${anchor})</u>`)
                } else {
                    const anchor = toAnchor(optionPath, rootSchema);
                    md.push(`- <u>[Option ${optionIndex}](#${anchor})</u>`)
                }
            }
        }
    });



    const combinators = [ "if", "then", "else", "not", "dependentSchemas"];
    const containsCombinator = combinators.some(keyword => node.schema[keyword] !== undefined);
    if (containsCombinator) {
        md.push(`<details>`)
        md.push(`<summary>Conditionals</summary>`)

        combinators.forEach((keyword) => {
            if (node.schema[keyword]) {
                md.push(`#### ${keyword}`);
                const content = formatDocumentExample(node.schema[keyword], settings.value.dataFormat);
                md.push("```json\n" + content + "\n```\n");
            }
        });

        md.push(`</details>`)
    }

    const instance = generateSchemaInstance(resolveReferences(node.schema, rootSchema), rootSchema);
    if (instance) {
        md.push("#### Example\n");
        md.push("```json");
        md.push(formatDocumentExample(instance, settings.value.dataFormat));
        md.push("```");
    }
}


function writeObjectAttribute(md: string[], propertyName: string, propertyTypeDescription: string, required: boolean, propertySchema: JsonSchemaObjectType, nodeData: SchemaNodeData, graph: SchemaGraph, rootSchema: TopLevelSchema, tableIncludesExamples: boolean) {
    const cleanAttrName = escapeMarkdown(propertyName);
    let type = escapeMarkdown(propertyTypeDescription);
    const requiredDesc = required ? '<span style="color:lightblue">true</span>' : '<span style="color:salmon">false</span>';
    let description = escapeMarkdown(propertySchema.description ?? "-");

    const defaults = getDefaultValues(propertySchema).map( def => {
        formatDocumentExample(def, settings.value.dataFormat)
    }).join(", ") || "-";
    const constraints = extractConstraints(propertySchema);
    if (hasOutgoingEdge(nodeData, graph) ) {
        type = `<u>[${type}](#${toAnchor(nodeData.absolutePath, rootSchema)})</u>`;
    }
    const row = [
        cleanAttrName,
        type,
        requiredDesc,
        description,
        defaults,
        constraints,
    ];
    if (tableIncludesExamples) {
        if (hasExample(propertySchema)) {
            const example = formatDocumentExample(propertySchema.examples![0], settings.value.dataFormat);
            row.push(escapeMarkdown(example));
        } else {
            row.push("-")
        }
    }
    md.push(`| ${row.join(" | ")} |`);
}


function writeEnumNode(md: string[], node: SchemaEnumNodeData) {
    const enumNode = node as SchemaEnumNodeData;
    const hideInSpoiler = node.values.length > settings.value.documentation.enumMaxCountToShowWithoutSpoiler;

    if (hideInSpoiler) {
      md.push(`<details>`)
      md.push(`<summary>Enumeration Values</summary>`)
    } else {
      md.push(`#### Enumeration Values`);
    }

    enumNode.values.forEach((val) => {
        md.push(`- \`${String(val)}\``);
    });

    if (hideInSpoiler) {
      md.push(`</details>`)
    }

  md.push("");
}