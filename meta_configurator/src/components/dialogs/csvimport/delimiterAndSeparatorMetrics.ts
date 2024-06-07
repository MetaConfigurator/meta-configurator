function getMostUsedDelimiter(csv: string, delimiters: string[]): string {
    //const delimiters = [',', ';', '\t', '|', ':']
    const delimiterCount = delimiters.map(delimiter => {
        return csv.split(delimiter).length
    })
    return delimiters[delimiterCount.indexOf(Math.max(...delimiterCount))]
}


// we check for the occurence count of the separator, but only for separators that are surrounded by integers
function getMostUsedDecimalSeparator(csv: string, separators: string[]): string {
    const separatorCount = separators.map(separator => {
        return csv.split(new RegExp(`\\d\\${separator}\\d`)).length
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
    const decimalSeparator = getMostUsedDecimalSeparator(csv, separators)
    return {delimiterSuggestion: delimiter, decimalSeparatorSuggestion: decimalSeparator}
}