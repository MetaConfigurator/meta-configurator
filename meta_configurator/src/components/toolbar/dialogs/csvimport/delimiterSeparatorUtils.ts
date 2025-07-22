import {
  decimalSeparatorOptions,
  delimiterOptions,
} from '@/components/toolbar/dialogs/csvimport/importCsvUtils';
import type {Path} from '@/utility/path';

function generateFloatRegexFull(delimiter: string, decimalSeparator: string): RegExp {
  const regexInside = generateFloatRegexForOneCell(decimalSeparator).source;
  return new RegExp(`(^|${delimiter})` + regexInside + `($|${delimiter})`, 'g');
}

function generateFloatRegexForOneCell(decimalSeparator: string): RegExp {
  return new RegExp(`\\s*-?(\\d+)\\${decimalSeparator}(\\d+)\\s*`);
}

function getMostUsedDelimiter(csv: string, delimiters: LabelledValue[]): LabelledValue {
  const delimiterCount = delimiters.map(delimiter => {
    return csv.split(delimiter.value).length;
  });
  return delimiters[delimiterCount.indexOf(Math.max(...delimiterCount))];
}

// we check for the occurrence count of the separator, but only for separators that are surrounded by integers
function getMostUsedDecimalSeparator(
  csv: string,
  separators: LabelledValue[],
  delimiterValue: string
): LabelledValue {
  const separatorCount = separators.map(separator => {
    return csv.split(generateFloatRegexFull(delimiterValue, separator.value)).length;
  });
  return separators[separatorCount.indexOf(Math.max(...separatorCount))];
}

export function computeMostUsedDelimiterAndDecimalSeparator(csv: string): {
  delimiterSuggestion: LabelledValue;
  decimalSeparatorSuggestion: LabelledValue;
} {
  const delimiter = getMostUsedDelimiter(csv, delimiterOptions);

  const availableDecimalSeparators = decimalSeparatorOptions.filter(
    separator => separator.value !== delimiter.value
  );
  if (availableDecimalSeparators.length === 1) {
    return {
      delimiterSuggestion: delimiter,
      decimalSeparatorSuggestion: availableDecimalSeparators[0],
    };
  }

  const decimalSeparator = getMostUsedDecimalSeparator(
    csv,
    availableDecimalSeparators,
    delimiter.value
  );
  return {delimiterSuggestion: delimiter, decimalSeparatorSuggestion: decimalSeparator};
}

export function replaceDecimalSeparator(
  csv: string,
  delimiter: string,
  decimalSeparatorOld: string,
  decimalSeparatorNew: string
): string {
  const regex = generateFloatRegexFull(delimiter, decimalSeparatorOld);
  return csv.replace(regex, (match, p1, p2, p3, p4) => {
    // Customize the replacement logic here
    return `${p1}${p2}${decimalSeparatorNew}${p3}${p4}`;
  });
}

export type LabelledValue = {
  label: string;
  value: string;
};

export type LabelledPath = {label: string; value: Path};
