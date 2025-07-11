import { constructSchemaGraph } from "@/schema/graph-representation/schemaGraphConstructor";
import type {
    SchemaObjectNodeData,
    SchemaObjectAttributeData,
    SchemaEnumNodeData,
} from "@/schema/graph-representation/schemaGraphTypes";
import { JsonSchemaWrapper } from "@/schema/jsonSchemaWrapper";
import { SessionMode } from "@/store/sessionMode";
import { describeSchema, OutputFormat } from "@/schema/schemaDescriptor";

export function schemaToMarkdown(schemaData: any) {
    const graph = constructSchemaGraph(schemaData, true);
    const md: string[] = [];

    md.push(`<div class="toc-wrapper">`);
    md.push(`<h3>Table of Contents</h3>`);

    const addedAnchors = new Set<string>();
    const tocLinks: string[] = [];

    graph.nodes.forEach((node) => {
        if (!["schemaobject", "schemaenum"].includes(node.getNodeType())) return;

        const name = (node.title ?? node.name ?? "Unnamed").replace(/[#*`]/g, "").trim();
        const anchor = toAnchor(name);

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

        const rawName = node.title ?? node.name ?? "Unnamed";
        const name = rawName.replace(/[#*`]/g, "").trim();
        const anchor = toAnchor(name);
        const description = node.description ?? "";

        if (["if", "then", "else"].includes(name.toLowerCase())) return;

        md.push("---");
        md.push(`### <a id="${anchor}"></a>${name}`);
        if (description) md.push(`*${description}*\n`);

        if (nodeType === "schemaobject") {
            const objectNode = node as SchemaObjectNodeData;
            const attributes = objectNode.attributes ?? [];
            const hasAnyExample = attributes.some(attr => hasExample(attr.schema));

            if (attributes.length > 0 || objectNode.patternProperties?.length || objectNode.additionalPropertiesSchema) {
                md.push("#### Properties\n");

                const header = ["Name", "Type", "Required", "Description", "Default", "Constraints"];
                if (hasAnyExample) header.push("Example");

                md.push(`| ${header.join(" | ")} |`);
                md.push(`|${header.map(() => "------").join("|")}|`);

                attributes.forEach((attr: SchemaObjectAttributeData) => {
                    const cleanAttrName = (attr.name ?? "-").replace(/[#*`]/g, "").trim();
                    const type = attr.typeDescription ?? "-";
                    const required = attr.required ? '<span style="color:lightblue">true</span>' : '<span style="color:salmon">false</span>';

                    let desc = attr.schema?.description ?? "-";
                    if (attr.schema?.deprecated) {
                        desc = `${desc} ⚠️ Deprecated`;
                    }

                    const def = JSON.stringify(generateDefaultValue(attr.schema));
                    const constraints = extractConstraints(attr.schema);
                    const row = [
                        `[${cleanAttrName}](#${toAnchor(cleanAttrName)})`,
                        type,
                        required,
                        desc,
                        def,
                        constraints,
                    ];
                    if (hasAnyExample) {
                        const example = JSON.stringify(generateExampleValue(attr.schema));
                        row.push(example);
                    }
                    md.push(`| ${row.join(" | ")} |`);

                    try {
                        const longDesc = describeSchema(
                            new JsonSchemaWrapper(attr.schema, SessionMode.SchemaEditor),
                            attr.name,
                            new JsonSchemaWrapper(objectNode.schema, SessionMode.SchemaEditor),
                            true,
                            0,
                            [],
                            OutputFormat.Markdown
                        ).trim();

                        if (longDesc) {
                            md.push("");
                            md.push(`> ${longDesc.replace(/\n/g, "\n> ")}`);
                            md.push("");
                        }
                    } catch {}
                });
                md.push("");

                if (objectNode.patternProperties?.length) {
                    md.push("#### Pattern Properties\n");
                    objectNode.patternProperties.forEach((pattern) => {
                        md.push(`- \`${pattern.regex}\`: ${pattern.schema.description ?? "(no description)"}`);
                    });
                    md.push("");
                }

                if (objectNode.additionalPropertiesSchema) {
                    md.push("#### Additional Properties\n");
                    md.push("This object allows additional properties with the following schema:");
                    md.push("```json\n" + JSON.stringify(objectNode.additionalPropertiesSchema, null, 2) + "\n```\n");
                }
            }

            const combinators = ["oneOf", "anyOf", "allOf", "if", "then", "else", "not", "dependentSchemas"];
            combinators.forEach((keyword) => {
                if (objectNode.schema[keyword]) {
                    md.push(`#### ${keyword}`);
                    const content = JSON.stringify(objectNode.schema[keyword], null, 2);
                    md.push("```json\n" + content + "\n```\n");
                }
            });

            const instance = generateSchemaInstance(objectNode.schema);
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

function generateExampleValue(schema: any): any {
    try {
        const wrapper = schema instanceof JsonSchemaWrapper ? schema : new JsonSchemaWrapper(schema, SessionMode.SchemaEditor);
        if (schema?.const !== undefined) return schema.const;
        return wrapper.initialValue();
    } catch {
        const type = schema?.type ?? "any";
        if (type === "string") return "`{string}`";
        if (type === "number") return "`{number}`";
        if (type === "integer") return "`{integer}`";
        if (type === "boolean") return "`{boolean}`";
        if (type === "array") return ["`{array-item}`"];
        if (type === "object") return { key: "`{value}`" };
        return "`{value}`";
    }
}

function generateDefaultValue(schema: any): any {
    try {
        const wrapper = schema instanceof JsonSchemaWrapper ? schema : new JsonSchemaWrapper(schema, SessionMode.SchemaEditor);
        return wrapper.initialValue();
    } catch {
        return undefined;
    }
}

function generateSchemaInstance(schema: any): any {
    try {
        const wrapper = schema instanceof JsonSchemaWrapper ? schema : new JsonSchemaWrapper(schema, SessionMode.SchemaEditor);
        if (schema?.const !== undefined) return schema.const;
        return wrapper.initialValue();
    } catch {
        const type = schema?.type ?? "any";
        if (type === "string") return "`{string}`";
        if (type === "number") return "`{number}`";
        if (type === "integer") return "`{integer}`";
        if (type === "boolean") return "`{boolean}`";
        if (type === "array") return ["`{array-item}`"];
        if (type === "object") {
            const props = schema.properties ?? {};
            const result: any = {};
            for (const key in props) {
                result[key] = generateSchemaInstance(props[key]);
            }
            return result;
        }
        return "`{value}`";
    }
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
    return constraints.length ? constraints.join(", ") : "-";
}

function toAnchor(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");
}
