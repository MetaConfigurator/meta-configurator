import {RdfTermType, XSD_NS} from '@/components/panels/rdf/rdfUtils';
import type {TripleTransferObject} from '@/components/panels/rdf/tripleEditorService';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';

const XSD = {
  string: `${XSD_NS}string`,
  boolean: `${XSD_NS}boolean`,
  integer: `${XSD_NS}integer`,
  decimal: `${XSD_NS}decimal`,
  double: `${XSD_NS}double`,
  float: `${XSD_NS}float`,
  date: `${XSD_NS}date`,
  dateTime: `${XSD_NS}dateTime`,
  time: `${XSD_NS}time`,
  duration: `${XSD_NS}duration`,
  anyURI: `${XSD_NS}anyURI`,
  long: `${XSD_NS}long`,
  short: `${XSD_NS}short`,
  byte: `${XSD_NS}byte`,
} as const;

export type DatatypeOption = {label: string; value: string};

export const COMMON_DATATYPES: DatatypeOption[] = [
  {label: 'Unspecified', value: ''},
  {label: 'xsd:string', value: XSD.string},
  {label: 'xsd:boolean', value: XSD.boolean},
  {label: 'xsd:integer', value: XSD.integer},
  {label: 'xsd:decimal', value: XSD.decimal},
  {label: 'xsd:double', value: XSD.double},
  {label: 'xsd:float', value: XSD.float},
  {label: 'xsd:date', value: XSD.date},
  {label: 'xsd:dateTime', value: XSD.dateTime},
  {label: 'xsd:time', value: XSD.time},
  {label: 'xsd:duration', value: XSD.duration},
  {label: 'xsd:anyURI', value: XSD.anyURI},
  {label: 'xsd:long', value: XSD.long},
  {label: 'xsd:short', value: XSD.short},
  {label: 'xsd:byte', value: XSD.byte},
];

export function isCommonDatatype(value: string): boolean {
  return COMMON_DATATYPES.some(opt => opt.value === value);
}

function commonDatatypeLabel(value: string): string {
  return (
    COMMON_DATATYPES.find(opt => opt.value === value)?.label ??
    jsonLdContextManager.toPrefixed(value)
  );
}

function isIntegerLexical(value: string): boolean {
  return /^[+-]?\d+$/.test(value);
}

function isDecimalLexical(value: string): boolean {
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value);
}

function isFloatOrDoubleLexical(value: string): boolean {
  if (value === 'INF' || value === '-INF' || value === 'NaN') return true;
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value);
}

function isDateLexical(value: string): boolean {
  const match = value.match(/^(-?\d{4,})-(\d{2})-(\d{2})(?:Z|[+-]\d{2}:\d{2})?$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isDateTimeLexical(value: string): boolean {
  return /^-?\d{4,}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
    value
  );
}

function isTimeLexical(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value);
}

function isDurationLexical(value: string): boolean {
  return /^-?P(?=\d|T\d)(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/.test(
    value
  );
}

function isInBigIntRange(value: string, min: bigint, max: bigint): boolean {
  try {
    const parsed = BigInt(value);
    return parsed >= min && parsed <= max;
  } catch {
    return false;
  }
}

function validateCommonDatatypeLiteral(value: string, datatype: string): string | null {
  switch (datatype) {
    case XSD.string:
      return null;
    case XSD.boolean:
      return /^(true|false|1|0)$/.test(value) ? null : 'Expected one of: true, false, 1, 0.';
    case XSD.integer:
      return isIntegerLexical(value) ? null : 'Expected an integer, e.g. 42 or -7.';
    case XSD.decimal:
      return isDecimalLexical(value) ? null : 'Expected a decimal number, e.g. 3.14 or -0.5.';
    case XSD.double:
    case XSD.float:
      return isFloatOrDoubleLexical(value)
        ? null
        : 'Expected a float/double number, e.g. 1.2e3, -0.5, INF, -INF, or NaN.';
    case XSD.date:
      return isDateLexical(value) ? null : 'Expected xsd:date in format YYYY-MM-DD.';
    case XSD.dateTime:
      return isDateTimeLexical(value)
        ? null
        : 'Expected xsd:dateTime in format YYYY-MM-DDThh:mm:ss (optional timezone).';
    case XSD.time:
      return isTimeLexical(value)
        ? null
        : 'Expected xsd:time in format hh:mm:ss (optional timezone).';
    case XSD.duration:
      return isDurationLexical(value)
        ? null
        : 'Expected xsd:duration in ISO 8601 format (e.g. P1DT2H).';
    case XSD.anyURI:
      return jsonLdContextManager.isIRI(value)
        ? null
        : 'Expected a valid absolute URI (e.g. https://qudt.org/vocab/unit/M).';
    case XSD.long:
      return isIntegerLexical(value) &&
        isInBigIntRange(value, BigInt('-9223372036854775808'), BigInt('9223372036854775807'))
        ? null
        : 'Expected an xsd:long integer in range [-9223372036854775808, 9223372036854775807].';
    case XSD.short:
      return isIntegerLexical(value) && isInBigIntRange(value, BigInt(-32768), BigInt(32767))
        ? null
        : 'Expected an xsd:short integer in range [-32768, 32767].';
    case XSD.byte:
      return isIntegerLexical(value) && isInBigIntRange(value, BigInt(-128), BigInt(127))
        ? null
        : 'Expected an xsd:byte integer in range [-128, 127].';
    default:
      return null;
  }
}

export function validateLiteralBeforeSave(triple: TripleTransferObject): string | null {
  if (triple.objectType !== RdfTermType.Literal) return null;

  const datatype = (triple.objectDatatype ?? '').trim();
  if (!datatype || !isCommonDatatype(datatype)) return null;

  const value = (triple.object ?? '').trim();
  const datatypeError = validateCommonDatatypeLiteral(value, datatype);
  if (!datatypeError) return null;

  return `Invalid literal for ${commonDatatypeLabel(datatype)}: "${value}". ${datatypeError}`;
}
