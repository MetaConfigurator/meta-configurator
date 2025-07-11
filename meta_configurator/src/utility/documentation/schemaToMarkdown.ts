import {
    constructSchemaGraph,
    nodesToObjectDefs,
    resolveEdgeTarget
} from "@/schema/graph-representation/schemaGraphConstructor";
import {
    type SchemaObjectNodeData,
    type SchemaObjectAttributeData,
    type SchemaEnumNodeData, SchemaNodeData, SchemaGraph,
} from "@/schema/graph-representation/schemaGraphTypes";
import type {JsonSchemaObjectType, TopLevelSchema} from "@/schema/jsonSchemaType";
import {collectReferences, findTargetPath, resolveReferences} from "@/schema/resolveReferences";
import {pathToString} from "@/utility/pathUtils";
import {hasOutgoingEdge} from "@/schema/graph-representation/graphUtils";

export function schemaToMarkdown(rootSchema: TopLevelSchema) {
    const graph = constructSchemaGraph(rootSchema, true);
    const md: string[] = [];

    md.push(`<div class="toc-wrapper">`);
    md.push(`<h3>Table of Contents</h3>`);

    const addedAnchors = new Set<string>();
    const tocLinks: string[] = [];

    graph.nodes.forEach((node) => {
        if (!["schemaobject", "schemaenum"].includes(node.getNodeType())) return;

        const rawName = node.title ?? node.fallbackDisplayName;
        const name = escapeMarkdown(rawName);
        const anchor = toAnchor(node, rootSchema);

        if (["if", "then", "else"].includes(name.toLowerCase())) return;

        if (!addedAnchors.has(anchor)) {
            tocLinks.push(`<a href="#${anchor}">${name}</a>`);
            addedAnchors.add(anchor);
        }
    });

    md.push(`<div class="toc-links">${tocLinks.join("<br>")}</div>`);
    md.push(`</div>`);
    md.push("");

    graph.nodes.forEach((node) => {
        const nodeType = node.getNodeType();
        if (!["schemaobject", "schemaenum"].includes(nodeType)) return;

        const rawName = node.title ?? node.fallbackDisplayName;
        const name = escapeMarkdown(rawName);
        const anchor = toAnchor(node, rootSchema);
        const description = node.schema.description ?? "";

        if (["if", "then", "else"].includes(name.toLowerCase())) return;

        md.push("---");
        md.push(`### <a id="${anchor}"></a>${name}`);
        if (description) md.push(`*${description}*\n`);

        if (nodeType === "schemaobject") {
            const objectNode = node as SchemaObjectNodeData;
            const attributes = objectNode.attributes ?? [];
            const hasAnyExample = attributes.some(attr => hasExample(attr.schema));

            if (attributes.length > 0 || objectNode.schema.patternProperties?.length || objectNode.schema.additionalProperties) {
                md.push("#### Properties\n");

                const header = ["Name", "Type", "Required", "Description", "Default", "Constraints"];
                if (hasAnyExample) header.push("Example");

                md.push(`| ${header.join(" | ")} |`);
                md.push(`|${header.map(() => "------").join("|")}|`);

                attributes.forEach((attr: SchemaObjectAttributeData) => {
                    const cleanAttrName = escapeMarkdown(attr.name ?? "-");
                    let type = escapeMarkdown(attr.typeDescription ?? "-");
                    const required = attr.required ? '<span style="color:lightblue">true</span>' : '<span style="color:salmon">false</span>';
                    let description = escapeMarkdown(attr.schema?.description ?? "-");

                    const defaults = getDefaultValues(attr.schema).map( def => {
                        JSON.stringify(def)
                    }).join(", ") || "-";
                    const constraints = extractConstraints(attr.schema);
                   if (hasOutgoingEdge(attr, graph) ) {
                       type = `<u>[${type}](#${toAnchor(attr, rootSchema)})</u>`;
                   }
                    const row = [
                        cleanAttrName,
                        type,
                        required,
                        description,
                        defaults,
                        constraints,
                    ];
                    if (hasAnyExample) {
                        if (hasExample(attr.schema)) {
                            const example = JSON.stringify(attr.schema!.examples![0]);
                            row.push(escapeMarkdown(example));
                        } else {
                            row.push("-")
                        }
                    }
                    md.push(`| ${row.join(" | ")} |`);
                });


                if (objectNode.schema.additionalProperties) {
                    const objectDefs = nodesToObjectDefs(graph.nodes);
                    const edgeTargetResult = resolveEdgeTarget(objectNode, objectNode.schema.additionalProperties, [...objectNode.absolutePath, 'additionalProperties'], objectDefs)
                    const edgeTarget = edgeTargetResult[0]
                    const isArray = edgeTargetResult[1]
                    if (edgeTarget) {
                        const type = escapeMarkdown(edgeTarget.title || edgeTarget.fallbackDisplayName);
                        const required = '<span style="color:salmon">false</span>'

                        let description = escapeMarkdown(edgeTarget.schema.description ?? "-");

                        const defaults = getDefaultValues(edgeTarget.schema).map(def => {
                            escapeMarkdown(JSON.stringify(def))
                        }).join(", ") || "-";
                        const constraints = extractConstraints(edgeTarget.schema);
                        const row = [
                            `{string}`,
                            `[${type}](#${toAnchor(edgeTarget, rootSchema)})`,
                            required,
                            description,
                            defaults,
                            constraints,
                        ];
                        if (hasAnyExample) {
                            if (hasExample(edgeTarget.schema)) {
                                const example = JSON.stringify(edgeTarget.schema!.examples![0]);
                                row.push(example);
                            } else {
                                row.push("-")
                            }
                        }
                        md.push(`| ${row.join(" | ")} |`);
                    }
                }


                md.push("");
            }

            const combinators = ["oneOf", "anyOf", "allOf", "if", "then", "else", "not", "dependentSchemas"];
            combinators.forEach((keyword) => {
                if (objectNode.schema[keyword]) {
                    md.push(`#### ${keyword}`);
                    const content = JSON.stringify(objectNode.schema[keyword], null, 2);
                    md.push("```json\n" + content + "\n```\n");
                }
            });

            const instance = generateSchemaInstance(resolveReferences(objectNode.schema, rootSchema), rootSchema);
            if (instance) {
                md.push("#### Example\n");
                md.push("```json");
                md.push(JSON.stringify(instance, null, 2));
                md.push("```");
            }
        }

        if (nodeType === "schemaenum") {
            const enumNode = node as SchemaEnumNodeData;
            md.push("#### Values\n");
            enumNode.values.forEach((val) => {
                md.push(`- \`${String(val)}\``);
            });
            md.push("");
        }
    });

    return md.join("\n");
}



function hasExample(schema: any): boolean {
    return schema && Array.isArray(schema.examples) && schema.examples.length > 0;
}


function getDefaultValues(schema: any): any[] {
    if (schema.defaults && schema.defaults.length > 0) {
        return schema.defaults;
    }
    return []
}

function generateSchemaInstance(schema: any, rootSchema: TopLevelSchema, visitedReferences: Set<string>|undefined = undefined): any {
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

    if (visitedReferences == undefined) {
        visitedReferences = new Set();
    }
    // mark the current schema as visited so children will not visit it again if not required
    visitedReferences = visitedReferences.union(collectReferences(schema, rootSchema));

    // resolve the references of the current schema if needed
    const resolvedSchema: JsonSchemaObjectType = resolveReferences(schema, rootSchema)

        const type = resolvedSchema?.type ?? "any";
        if (type === "string") return "{string}";
        if (type === "number") return "{number}";
        if (type === "integer") return "{integer}";
        if (type === "boolean") return "{boolean}";
        if (type === "array") {
            const arrayItemInstance = generateSchemaInstance(resolvedSchema.items, rootSchema, visitedReferences);
            const itemCount = Math.max(schema.minItems || 0, 1);
            const resultArray: any[] = []
            for (let i = 0; i < itemCount; i++) {
                resultArray.push(arrayItemInstance)
            }
            return resultArray as any;
        }
        if (type === "object") {
            const props = resolvedSchema.properties ?? {};
            const patternProps = resolvedSchema.patternProperties ?? {};
            const additionalProps = resolvedSchema.additionalProperties ?? true;
            const required = resolvedSchema.required ?? [];
            const result: any = {};
            for (const key in props) {
                const propertySchema = props[key];
                const propertyReferences = collectReferences(propertySchema, rootSchema);
                const propertyRefIsNotAlreadyVisited = propertyReferences.isDisjointFrom(visitedReferences);
                if (required.includes(key) || propertyRefIsNotAlreadyVisited)
                    result[key] = generateSchemaInstance(propertySchema, rootSchema, visitedReferences);
            }
            for (const key in patternProps) {
                const propertySchema = patternProps[key];
                const propertyReferences = collectReferences(propertySchema, rootSchema);
                const propertyRefIsNotAlreadyVisited = propertyReferences.isDisjointFrom(propertyReferences);
                if (key in required || propertyRefIsNotAlreadyVisited)
                    result[key] = generateSchemaInstance(propertySchema, rootSchema, visitedReferences);
            }
            if (additionalProps && additionalProps != true) {
                result["additionalProp"] = generateSchemaInstance(additionalProps, rootSchema, visitedReferences);
            }
            return result;
        }
        return "{value}";
}

function extractConstraints(schema: any): string {
    if (!schema) return "-";
    const constraints: string[] = [];
    const keys = ["minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "pattern", "format", "enum", "const", "multipleOf"];
    for (const key of keys) {
        if (key in schema) {
            constraints.push(`${key}: ${JSON.stringify(schema[key])}`);
        }
    }
    const deprecated = schema.deprecated == true;

    if (deprecated) {
        return constraints.length ? constraints.join(", ") + ". Deprecated." : "Deprecated.";
    } else {
        return constraints.length ? constraints.join(", ") : "-";
    }
}

function toAnchor(node: SchemaNodeData, rootSchema: TopLevelSchema): string {
    const resolvedPath = findTargetPath(node.absolutePath, rootSchema, true)
    return pathToString(resolvedPath)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");
}

function escapeMarkdown(text: string | undefined | null): string {
    if (!text) return "-";
    return text
        .replace(/\\/g, '\\\\')     // Escape backslashes
        .replace(/([_*[\]()#+\-!`>])/g, '\\$1') // Escape Markdown symbols
        .replace(/</g, '&lt;')       // Escape angle brackets
        .replace(/>/g, '&gt;')       // Escape angle brackets
        .trim();
}