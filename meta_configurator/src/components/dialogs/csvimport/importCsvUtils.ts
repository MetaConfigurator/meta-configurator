import {useFileDialog} from "@vueuse/core";
import {readFileContentToRef} from "@/utility/readFileContent";
import type {Ref} from "vue";
import { getSchemaForMode} from "@/data/useDataLink";
import {SessionMode} from "@/store/sessionMode";
import {dataPathToSchemaPath, pathToString} from "@/utility/pathUtils";
import _ from "lodash";
import {inferJsonSchema} from "@/schema/inferJsonSchema";
import {mergeAllOfs} from "@/schema/mergeAllOfs";
import type {Path} from "@/utility/path";
import type {CsvImportColumnMappingData} from "@/components/dialogs/csvimport/csvImportTypes";
import {type LabelledValue, replaceDecimalSeparator} from "@/components/dialogs/csvimport/delimiterSeparatorUtils";
import {type CsvError, parse} from "csv-parse/browser/esm";

export function requestUploadFileToRef(resultString: Ref<string>) {
    const {open, onChange} = useFileDialog();

    onChange((files: FileList | null) => {
        readFileContentToRef(files,resultString);
    });
    open();
}



export function inferSchemaForNewDataAndMergeIntoCurrentSchema(newData: any, newDataPath: Path, currentColumnMapping: CsvImportColumnMappingData[]) {
    // we want to obtain an object which contains only the new data, in its proper path
    const dataWithOnlyNew = _.set({}, pathToString(newDataPath), newData);

    const inferredSchema = inferJsonSchema(dataWithOnlyNew);
    if (inferredSchema) {
        for (const column of currentColumnMapping) {
            addCustomTitleToSchemaProperty(inferredSchema, column);
        }

        const schema = getSchemaForMode(SessionMode.DataEditor);
        const currentSchema = schema.schemaRaw.value;
        // then we merge the new schema into the current one
        getSchemaForMode(SessionMode.DataEditor).schemaRaw.value = mergeAllOfs({
            allOf: [currentSchema, inferredSchema],
        });
    }
}



function addCustomTitleToSchemaProperty(inferredSchema: any, column: CsvImportColumnMappingData) {
    const propertySchemaTitlePath = [
        ...dataPathToSchemaPath(column.getPathForJsonDocument(0)),
        'title',
    ];
    const titlePathString = pathToString(propertySchemaTitlePath);
    _.set(inferredSchema, titlePathString, column.titleInSchema);
}


export function loadCsvFromUserString(currentUserDataString: Ref<string>, currentUserCsv: Ref<any[]>, delimiter: string, decimalSeparator: string, errorMessage: Ref<string>) {
    if (currentUserDataString.value.length > 0) {

        let inputString = currentUserDataString.value;
        if (decimalSeparator !== '.') {
            inputString = replaceDecimalSeparator(inputString, delimiter, decimalSeparator, '.')
        }

        parse(
            inputString,
            {
                delimiter: delimiter,
                columns: true,
                skip_empty_lines: true,
                cast: true,
                trim: true,
            },
            (error: CsvError | undefined, records: any) => {
                if (error) {
                    errorMessage.value = "With the given delimiter and decimal separator, the CSV could not be parsed. " +
                        "\nPlease check the settings. " +
                        "\nError: " + error.message;
                    currentUserCsv.value = [];
                } else {
                    errorMessage.value = "";
                    currentUserCsv.value = records;
                }
            }
        );

    } else {
        currentUserCsv.value = [];
    }
}


export const delimiterOptions: LabelledValue[] = [
    {
        label: ',',
        value: ',',
    },
    {
        label: ';',
        value: ';',
    },
    {
        label: 'Tab',
        value: '\t',
    },
    {
        label: 'Space',
        value: ' ',
    },
    {
        label: '|',
        value: '|',
    },
];

export const decimalSeparatorOptions: LabelledValue[] = [
    {
        label: '.',
        value: '.',
    },
    {
        label: ',',
        value: ',',
    },
];
