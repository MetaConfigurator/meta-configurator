import {describe, expect, it} from 'vitest';
import {
  DEFAULT_XML_IMPORT_OPTIONS,
  xmlToJsonDataWithOptions,
} from '@/components/toolbar/dialogs/xml-import/importXmlUtils';

describe('xmlToJsonDataWithOptions', () => {
  it('uses the configured attribute prefix', () => {
    const result = xmlToJsonDataWithOptions('<root id="1" />', {
      ...DEFAULT_XML_IMPORT_OPTIONS,
      attributeNamePrefix: '$',
    });

    expect(result).toEqual({root: {$id: '1'}});
  });

  it('parses tag and attribute values when enabled', () => {
    const result = xmlToJsonDataWithOptions('<root id="1"><child>42</child></root>', {
      ...DEFAULT_XML_IMPORT_OPTIONS,
      parseTagValue: true,
      parseAttributeValue: true,
    });

    expect(result).toEqual({root: {child: 42, _id: 1}});
  });

  it('keeps surrounding whitespace when trim values is disabled', () => {
    const result = xmlToJsonDataWithOptions('<root>  spaced  </root>', {
      ...DEFAULT_XML_IMPORT_OPTIONS,
      trimValues: false,
    });

    expect(result).toEqual({root: '  spaced  '});
  });

  it('removes namespace prefixes when enabled', () => {
    const result = xmlToJsonDataWithOptions('<ns:root><ns:item>value</ns:item></ns:root>', {
      ...DEFAULT_XML_IMPORT_OPTIONS,
      removeNSPrefix: true,
    });

    expect(result).toEqual({root: {item: 'value'}});
  });

  it('uses configured text, comment, and CDATA property names', () => {
    const result = xmlToJsonDataWithOptions(
      '<root><!--note--><![CDATA[raw]]><value>text</value></root>',
      {
        ...DEFAULT_XML_IMPORT_OPTIONS,
        textNodeName: 'text',
        commentPropName: 'comment',
        cdataPropName: 'cdata',
        alwaysCreateTextNode: true,
      }
    );

    expect(result).toEqual({
      root: {
        comment: {
          text: 'note',
        },
        cdata: {
          text: 'raw',
        },
        value: {
          text: 'text',
        },
      },
    });
  });
});
