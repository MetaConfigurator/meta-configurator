import {XMLBuilder, type XmlBuilderOptions} from 'fast-xml-parser';
import {useDataSource} from '@/data/dataSource';
import {useCurrentData} from '@/data/useDataLink';

export interface XmlExportOptions {
  attributeNamePrefix: string;
  textNodeName: string;
  cdataPropName: string;
  commentPropName: string;
  format: boolean;
  indentationSpaces: number;
  suppressEmptyNode: boolean;
  suppressBooleanAttributes: boolean;
  oneListGroup: boolean;
}

export const DEFAULT_XML_EXPORT_OPTIONS: XmlExportOptions = {
  attributeNamePrefix: '_',
  textNodeName: '#text',
  cdataPropName: '#cdata',
  commentPropName: '#comment',
  format: true,
  indentationSpaces: 2,
  suppressEmptyNode: true,
  suppressBooleanAttributes: false,
  oneListGroup: false,
};

export function exportXmlData(options: XmlExportOptions): void {
  const xmlContent = jsonToXmlDataWithOptions(useCurrentData().data.value, options);
  downloadXmlContent(xmlContent, useDataSource().userSchemaData.value.title ?? 'untitled');
}

export function jsonToXmlDataWithOptions(data: any, options: XmlExportOptions): string {
  const builder = new XMLBuilder(createXmlBuilderOptions(options));
  return builder.build(data);
}

function createXmlBuilderOptions(options: XmlExportOptions): XmlBuilderOptions {
  return {
    attributesGroupName: false,
    attributeNamePrefix: options.attributeNamePrefix,
    textNodeName: options.textNodeName,
    ignoreAttributes: false,
    cdataPropName: options.cdataPropName || false,
    commentPropName: options.commentPropName || false,
    processEntities: true,
    preserveOrder: false,
    format: options.format,
    indentBy: ' '.repeat(options.indentationSpaces),
    arrayNodeName: undefined,
    suppressEmptyNode: options.suppressEmptyNode,
    suppressUnpairedNode: false,
    suppressBooleanAttributes: options.suppressBooleanAttributes,
    unpairedTags: [],
    stopNodes: [],
    oneListGroup: options.oneListGroup,
  };
}

function downloadXmlContent(content: string, fileNamePrefix: string): void {
  const blob = new Blob([content], {type: 'application/xml'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileNamePrefix}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
