import { constructSchemaGraph } from "@/schema/graph-representation/schemaGraphConstructor";
import type {
    SchemaObjectNodeData,
    SchemaObjectAttributeData,
    SchemaEnumNodeData,
} from "@/schema/graph-representation/schemaGraphTypes";

export function schemaToMarkdown(schemaData: any) {
    const graph = constructSchemaGraph(schemaData, true);
    const md: string[] = [];

    md.push("## Table of Contents");
    md.push("");

    const addedAnchors = new Set<string>();

    graph.nodes.forEach((node) => {
        if (!["schemaobject", "schemaenum"].includes(node.getNodeType())) return;

        const name = node.title ?? node.name ?? "Unnamed";
        const cleanName = name.replace(/\*\*/g, "").trim();
        const anchor = toAnchor(cleanName);

        if (!addedAnchors.has(anchor)) {
            md.push(`- [${cleanName}](#${anchor})`);
            addedAnchors.add(anchor);
        }
    });

    graph.nodes.forEach((node) => {
        const nodeType = node.getNodeType();
        if (!["schemaobject", "schemaenum"].includes(nodeType)) return;

        const rawName = node.title ?? node.name ?? "Unnamed";
        const name = rawName.replace(/\*\*/g, "").trim();
        const description = node.description ?? "";

        md.push("");
        md.push("---");
        md.push("");
        md.push(`## ${name}`);
        if (description) {
            md.push("");
            md.push(`*${description}*`);
        }

        if (nodeType === "schemaobject") {
            const objectNode = node as SchemaObjectNodeData;

            if (Array.isArray(objectNode.attributes) && objectNode.attributes.length > 0) {
                md.push("");
                md.push("### Properties");
                md.push("");
                md.push("| Name | Type | Required | Description | Default | Example |");
                md.push("|------|------|----------|-------------|---------|---------|");

                objectNode.attributes.forEach((attr: SchemaObjectAttributeData) => {
                    const name = attr.name ?? "-";
                    const type = attr.typeDescription ?? "-";
                    const required = attr.required
                        ? '<span style="color:lightblue">true</span>'
                        : '<span style="color:salmon">false</span>';
                    const desc = attr.schema?.description ?? "-";

                    const defValue = generateDefaultValue(attr.schema);
                    const exampleValue = generateExampleValue(attr.schema);

                    const def = JSON.stringify(defValue);
                    const example = JSON.stringify(exampleValue);

                    md.push(`| ${name} | ${type} | ${required} | ${desc} | ${def} | ${example} |`);
                });

                md.push("");
            }

            if (objectNode.example) {
                md.push("");
                md.push("### Example");
                md.push("");
                md.push("```json");
                md.push(JSON.stringify(objectNode.example, null, 2));
                md.push("```");
                md.push("");
            }
        }

        if (nodeType === "schemaenum") {
            const enumNode = node as SchemaEnumNodeData;

            md.push("");
            md.push("### Values");
            md.push("");
            enumNode.values.forEach((val) => {
                md.push(`- \`${val}\``);
            });
            md.push("");
        }
    });

    return md.join("\n");
}

function generateExampleValue(schema: any): any {
    if (!schema) return undefined;
    if (Array.isArray(schema.examples) && schema.examples.length > 0) {
        return schema.examples[0];
    }
    return generateDefaultValue(schema); // fallback to default logic
}

function generateDefaultValue(schema: any): any {
    if (!schema) return undefined;

    if (schema.default !== undefined) return schema.default;

    switch (schema.type) {
        case "string":
            return "example";
        case "number":
        case "integer":
            return 0;
        case "boolean":
            return false;
        case "array":
            return [];
        case "object":
            return {};
        default:
            return `{${schema.type ?? "value"}}`;
    }
}

function toAnchor(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");
}
