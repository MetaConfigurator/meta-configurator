import {describe, expect, it, vi} from 'vitest';
import {performDataMapping} from "../performDataMapping";
import {type DataMappingConfig} from "../dataMappingTypes";


// avoid constructing useDataLink store through imports, it is not required for this component
vi.mock('@/data/useDataLink', () => ({
    getSchemaForMode: vi.fn(),
    getDataForMode: vi.fn(),
    useCurrentData: vi.fn(),
    useCurrentSchema: vi.fn(),
    getUserSelectionForMode: vi.fn(),
    getValidationForMode: vi.fn(),
    getSessionForMode: vi.fn(),
}));

describe('test performing data mappings on a given input file, based on a mapping configuration', () => {

    const inputData = {
        people: [{
            name: 'John Doe',
            age: 30,
            address: {
                street: '123 Main St',
                city: 'Anytown',
                zip: '12345'
            },
            hobbies: [
                {
                    name: 'reading',
                    type: 'indoor'
                },
                {
                    name: 'gaming',
                    type: 'indoor'
                }
            ]
        },{
            name: 'Jane Smith',
            age: 25,
            address: {
                street: '456 Elm St',
                city: 'Othertown',
                zip: '67890'
            },
            hobbies: [
                {
                    name: 'cooking',
                    type: 'indoor'
                },
                {
                    name: 'traveling',
                    type: 'outdoor'
                }
            ]
        }
        ],
        books: [
            {
                title: 'Book 1',
            },
            {
                title: 'Book 2',
            }
        ],
        year: 2050,
    }

    const mappingConfig: DataMappingConfig = {
        // note that only values get copied for which exists a mapping. Map all values except the address
        mappings: [
            {
                sourcePath: "/people/%INDEX_A%/name",
                targetPath: "/person/%INDEX_A%/fullName"
            },
            {
                sourcePath: "/people/%INDEX_A%/age",
                targetPath: "/person/%INDEX_A%/age"
            },
            {
                sourcePath: "/books/%INDEX_A%/title",
                targetPath: "/library/%INDEX_A%/bookTitle"
            },
            {
                sourcePath: "/people/%INDEX_A%/hobbies/%INDEX_B%/name",
                targetPath: "/person/%INDEX_A%/activities/%INDEX_B%/hobbyName"
            },
            {
                sourcePath: "/people/%INDEX_A%/hobbies/%INDEX_B%/type",
                targetPath: "/person/%INDEX_A%/activities/%INDEX_B%/hobbyType"
            },
            {
                sourcePath: "/year",
                targetPath: "/year"
            }
        ],
        transformations: [
            {
                operationType: "mathFormula",
                sourcePath: "/people/%INDEX_A%/age",
                formula: "x + 1"
            },
            {
                operationType: "stringOperation",
                sourcePath: "/people/%INDEX_A%/name",
                string: "uppercase"
            },
            {
                operationType: "valueMapping",
                sourcePath: "/books/%INDEX_A%/title",
                valueMapping: {
                    "Book 1": "First Book",
                    "Book 2": "Second Book"
                }
            }
        ]
    }


    it('test the complete mapping', () => {
        const result = performDataMapping(inputData, mappingConfig);

        expect(result).toEqual({
            person: [
                {
                    fullName: 'JOHN DOE',
                    age: 31,
                    activities: [
                        {
                            hobbyName: 'reading',
                            hobbyType: 'indoor'
                        },
                        {
                            hobbyName: 'gaming',
                            hobbyType: 'indoor'
                        }
                    ]
                },
                {
                    fullName: 'JANE SMITH',
                    age: 26,
                    activities: [
                        {
                            hobbyName: 'cooking',
                            hobbyType: 'indoor'
                        },
                        {
                            hobbyName: 'traveling',
                            hobbyType: 'outdoor'
                        }
                    ]
                }
            ],
            library: [
                {
                    bookTitle: 'First Book'
                },
                {
                    bookTitle: 'Second Book'
                }
            ],
            year: 2050
        });
    });


});
