import type {TopLevelSchema} from '@/schema/jsonSchemaType';

export const DATA_MAPPING_SCHEMA: TopLevelSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {
        mappings: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    sourcePath: {
                        type: "string",
                        pattern: "^#/[^/]+(/%INDEX_[A-Z]+)?(/[^/]+(/%INDEX_[A-Z]+)*)*$"
                    },
                    targetPath: {
                        type: "string",
                        pattern: "^#/[^/]+(/%INDEX_[A-Z]+)?(/[^/]+(/%INDEX_[A-Z]+)*)*$"
                    }
                },
                required: [
                    "sourcePath",
                    "targetPath"
                ]
            }
        },
        transformations: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    operationType: {
                        type: "string",
                        enum: [
                            "mathFormula",
                            "stringOperation",
                            "valueMapping"
                        ]
                    },
                    sourcePath: {
                        type: "string",
                        pattern: "^#/[^/]+(/%INDEX_[A-Z]+)?(/[^/]+(/%INDEX_[A-Z]+)*)*$"
                    },
                    formula: {
                        type: "string",
                        maxLength: 255
                    },
                    string: {
                        type: "string",
                        maxLength: 255,
                        pattern: "%VALUE%"
                    },
                    valueMapping: {
                        type: "object",
                        additionalProperties: {}
                    }
                },
                required: [
                    "operationType",
                    "sourcePath"
                ],
                anyOf: [
                    {
                        required: [
                            "formula"
                        ],
                        properties: {
                            operationType: {
                                const: "mathFormula"
                            }
                        }
                    },
                    {
                        required: [
                            "string"
                        ],
                        properties: {
                            operationType: {
                                const: "stringOperation"
                            }
                        }
                    },
                    {
                        required: [
                            "valueMapping"
                        ],
                        properties: {
                            operationType: {
                                const: "valueMapping"
                            }
                        }
                    }
                ]
            }
        }
    },
    required: [
        "mappings",
        "transformations"
    ]
}