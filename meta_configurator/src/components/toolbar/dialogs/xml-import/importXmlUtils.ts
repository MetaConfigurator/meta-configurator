import {readFileContentToStringRef} from '@/utility/readFileContent';
import type {Ref} from 'vue';
import {createLazySingleFileDialog} from '@/utility/fileDialogUtils';
import {XMLParser, type X2jOptions} from 'fast-xml-parser';

const xmlFileDialog = createLazySingleFileDialog('.xml');

export interface XmlImportOptions {
  attributeNamePrefix: string;
  textNodeName: string;
  cdataPropName: string;
  commentPropName: string;
  trimValues: boolean;
  allowBooleanAttributes: boolean;
  parseTagValue: boolean;
  parseAttributeValue: boolean;
  removeNSPrefix: boolean;
  alwaysCreateTextNode: boolean;
  processEntities: boolean;
}

export const DEFAULT_XML_IMPORT_OPTIONS: XmlImportOptions = {
  attributeNamePrefix: '_',
  textNodeName: '#text',
  cdataPropName: '#cdata',
  commentPropName: '#comment',
  trimValues: true,
  allowBooleanAttributes: true,
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: false,
  alwaysCreateTextNode: false,
  processEntities: true,
};

export function requestUploadXmlFileToRef(resultString: Ref<string>): void {
  xmlFileDialog.openForSelection(files => {
    readFileContentToStringRef(files, resultString);
  });
}

export function xmlToJsonDataWithOptions(xmlString: string, options: XmlImportOptions): any {
  const parser = new XMLParser(createXmlParserOptions(options));
  return parser.parse(xmlString);
}

function createXmlParserOptions(options: XmlImportOptions): X2jOptions {
  return {
    attributesGroupName: false,
    attributeNamePrefix: options.attributeNamePrefix,
    textNodeName: options.textNodeName,
    ignoreAttributes: false,
    removeNSPrefix: options.removeNSPrefix,
    allowBooleanAttributes: options.allowBooleanAttributes,
    parseTagValue: options.parseTagValue,
    parseAttributeValue: options.parseAttributeValue,
    trimValues: options.trimValues,
    cdataPropName: options.cdataPropName || false,
    commentPropName: options.commentPropName || false,
    alwaysCreateTextNode: options.alwaysCreateTextNode,
    processEntities: options.processEntities,
    preserveOrder: false,
  };
}
