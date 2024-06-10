
function generateFloatRegexFull(delimiter: string, decimalSeparator: string): RegExp {
    const regexInside = generateFloatRegexForOneCell(decimalSeparator).source
    return new RegExp(`(^|${delimiter})` + regexInside + `($|${delimiter})`, 'g');
}

function generateFloatRegexForOneCell(decimalSeparator: string): RegExp {
    return new RegExp(`\\s*-?(\\d+)\\${decimalSeparator}(\\d+)\\s*`);
}

function getMostUsedDelimiter(csv: string, delimiters: string[]): string {
    //const delimiters = [',', ';', '\t', '|', ':']
    const delimiterCount = delimiters.map(delimiter => {
        return csv.split(delimiter).length
    })
    return delimiters[delimiterCount.indexOf(Math.max(...delimiterCount))]
}


// we check for the occurrence count of the separator, but only for separators that are surrounded by integers
function getMostUsedDecimalSeparator(csv: string, separators: string[], delimiter: string): string {
    const separatorCount = separators.map(separator => {
        return csv.split(generateFloatRegexFull(delimiter, separator)).length
    })
    return separators[separatorCount.indexOf(Math.max(...separatorCount))]
}

export function computeMostUsedDelimiterAndDecimalSeparator(csv: string) {
    const delimiters = [',', ';', '\t', '|', ':']
    const delimiter = getMostUsedDelimiter(csv, delimiters)

    if (delimiter == ','){
        return {delimiterSuggestion: delimiter, decimalSeparatorSuggestion: '.'}
    }

    const separators = ['.', ',']
    const decimalSeparator = getMostUsedDecimalSeparator(csv, separators, delimiter)
    return {delimiterSuggestion: delimiter, decimalSeparatorSuggestion: decimalSeparator}
}

export function replaceDecimalSeparator(csv: string, delimiter: string, decimalSeparatorOld: string, decimalSeparatorNew: string): string {
    const regex = generateFloatRegexFull(delimiter, decimalSeparatorOld)
    return csv.replace(regex, (match, p1, p2, p3, p4) => {
        // Customize the replacement logic here
        return `${p1}${p2}${decimalSeparatorNew}${p3}${p4}`;
    });
}