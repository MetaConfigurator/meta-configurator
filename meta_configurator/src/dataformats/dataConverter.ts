import YAML from 'yaml';
import {type X2jOptions, XMLBuilder, type XmlBuilderOptions, XMLParser} from 'fast-xml-parser';
import {useSettings} from '@/settings/useSettings';

/**
 * Abstract super class for converters that can parse and stringify data.
 */
export abstract class DataConverter {
  /**
   * Parses the given data and returns the result.
   *
   * @param data the string to parse.
   * @throws Error if the data could not be parsed.
   */
  abstract parse(data: string): any;

  /**
   * Generates a string representation of the given data.
   * This method should be the inverse of parse.
   * Implementations should not throw an error.
   *
   * @param data the data to stringify.
   * @returns the string representation of the data. This should be a valid input for parse.
   * If the data is undefined, an empty string should be returned.
   */
  abstract stringify(data: any): string;

  /**
   * Returns true if the given data is valid for this converter.
   * Uses the parse method to check if the data can be parsed.
   *
   * This should only be used if the actual parsed data is not needed,
   * as otherwise the data is parsed twice.
   *
   * Do not: if (isValidSyntax(data)) { parse(data); }
   * Do: parseIfValid(data, (parsedData) => { ... });
   *
   * @param data the data to check
   */
  isValidSyntax(data: string): boolean {
    try {
      this.parse(data);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Parses the given data and calls the callback with the result.
   * If the data is not valid, the callback is not called, no error is thrown.
   *
   * @param data the data to parse
   * @param callback the callback to call with the parsed data
   */
  parseIfValid(data: string, callback: (data: any) => void): void {
    try {
      callback(this.parse(data));
    } catch (e) {
      // ignore
    }
  }
}

/**
 * DataConverter implementation for JSON.
 */
export class DataConverterJson extends DataConverter {
  override parse(data: string): any {
    return JSON.parse(data);
  }

  override stringify(data: any): string {
    if (data === undefined) {
      return '';
    }
    return JSON.stringify(data, null, useSettings().value.codeEditor.tabSize);
  }
}

/**
 * DataConverter implementation for YAML.
 */
export class DataConverterYaml extends DataConverter {
  override parse(data: string): any {
    return YAML.parse(data);
  }

  override stringify(data: any): string {
    return YAML.stringify(data, {
      indent: useSettings().value.codeEditor.tabSize,
    });
  }
}

const xmlOptions: X2jOptions = {
  attributesGroupName: false, //Attributes are already grouped by preserveOrder: true
  textNodeName: '#text', // Preserve text nodes explicitly
  ignoreAttributes: false, // Ensure attributes are parsed
  removeNSPrefix: false, // Keep XML namespaces intact
  allowBooleanAttributes: true, // Allow attributes without values
  parseTagValue: false, // Preserve values as strings
  parseAttributeValue: false, // Preserve attribute values as strings
  trimValues: true, // Trim whitespace
  cdataPropName: '#cdata', // Store CDATA separately
  commentPropName: '#comment', // Store comments explicitly
  alwaysCreateTextNode: false, // Do not always create text nodes to allow JSON 2 XML and then back works
  processEntities: true, // Convert entities like `&amp;`
  preserveOrder: false, // Maintain the order of elements
};

const xmlBuilderOptions: XmlBuilderOptions = {
  attributesGroupName: false, //Attributes are already grouped by preserveOrder: true
  textNodeName: '#text', // Preserve text nodes explicitly
  ignoreAttributes: false, // Ensure attributes are parsed
  cdataPropName: '#cdata', // Store CDATA separately
  commentPropName: '#comment', // Store comments explicitly
  processEntities: true, // Convert entities like `&amp;`
  preserveOrder: false, // Maintain the order of elements
  format: true, // Pretty-prints the output for readability
  indentBy: '  ', // Uses two spaces for indentation
  arrayNodeName: undefined, // Keeps array structures as they appear in the XML
  suppressEmptyNode: true, // If a node does not have children, it should be written in a self-closing tag
  suppressUnpairedNode: false, // Preserves unpaired tags
  suppressBooleanAttributes: false, // Keeps boolean attributes with values
  unpairedTags: [], // Does not enforce any predefined unpaired tags
  stopNodes: [], // Allows parsing of all nodes
  oneListGroup: false, // Ensures lists are not grouped automatically
};

/**
 * DataConverter implementation for XML.
 */
export class DataConverterXml extends DataConverter {
  override parse(data: string): any {
    const settings = useSettings().value.codeEditor.xml;
    xmlOptions.attributeNamePrefix = settings.attributeNamePrefix;

    const parser: XMLParser = new XMLParser(xmlOptions);
    return parser.parse(data);
  }

  override stringify(data: any): string {
    const settings = useSettings().value.codeEditor.xml;
    xmlBuilderOptions.attributeNamePrefix = settings.attributeNamePrefix;

    const builder: XMLBuilder = new XMLBuilder(xmlBuilderOptions);
    return builder.build(data);
  }
}
