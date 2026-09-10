import {describe, expect, it, vi} from 'vitest';

vi.mock('@/data/dataSource', () => ({
  useDataSource: () => ({
    userSchemaData: {
      value: {
        title: 'test',
      },
    },
  }),
}));

vi.mock('@/data/useDataLink', () => ({
  useCurrentData: () => ({
    data: {
      value: {},
    },
  }),
}));

import {
  DEFAULT_XML_EXPORT_OPTIONS,
  jsonToXmlDataWithOptions,
} from '@/components/toolbar/dialogs/xml-export/exportXmlData';

describe('jsonToXmlDataWithOptions', () => {
  it('uses the configured attribute prefix', () => {
    const result = jsonToXmlDataWithOptions(
      {root: {$id: '1', child: 'value'}},
      {
        ...DEFAULT_XML_EXPORT_OPTIONS,
        attributeNamePrefix: '$',
      }
    );

    expect(result).toContain('<root id="1">');
    expect(result).toContain('<child>value</child>');
  });

  it('uses the configured text node name', () => {
    const result = jsonToXmlDataWithOptions(
      {root: {value: 'text'}},
      {
        ...DEFAULT_XML_EXPORT_OPTIONS,
        textNodeName: 'value',
      }
    );

    expect(result).toBe('<root>text</root>\n');
  });

  it('uses the configured CDATA and comment property names', () => {
    const result = jsonToXmlDataWithOptions(
      {root: {cdata: 'raw', comment: 'note'}},
      {
        ...DEFAULT_XML_EXPORT_OPTIONS,
        cdataPropName: 'cdata',
        commentPropName: 'comment',
      }
    );

    expect(result).toContain('<![CDATA[raw]]>');
    expect(result).toContain('<!--note-->');
  });

  it('uses the configured indentation space count', () => {
    const result = jsonToXmlDataWithOptions(
      {root: {child: 'value'}},
      {
        ...DEFAULT_XML_EXPORT_OPTIONS,
        indentationSpaces: 4,
      }
    );

    expect(result).toContain('\n    <child>value</child>');
  });

  it('controls empty node suppression', () => {
    const suppressed = jsonToXmlDataWithOptions(
      {root: {empty: ''}},
      {
        ...DEFAULT_XML_EXPORT_OPTIONS,
        format: false,
        suppressEmptyNode: true,
      }
    );
    const expanded = jsonToXmlDataWithOptions(
      {root: {empty: ''}},
      {
        ...DEFAULT_XML_EXPORT_OPTIONS,
        format: false,
        suppressEmptyNode: false,
      }
    );

    expect(suppressed).toBe('<root><empty/></root>');
    expect(expanded).toBe('<root><empty></empty></root>');
  });

  it('controls boolean attribute value suppression', () => {
    const withValue = jsonToXmlDataWithOptions(
      {root: {_disabled: true}},
      {
        ...DEFAULT_XML_EXPORT_OPTIONS,
        format: false,
        suppressBooleanAttributes: false,
      }
    );
    const withoutValue = jsonToXmlDataWithOptions(
      {root: {_disabled: true}},
      {
        ...DEFAULT_XML_EXPORT_OPTIONS,
        format: false,
        suppressBooleanAttributes: true,
      }
    );

    expect(withValue).toBe('<root disabled="true"/>');
    expect(withoutValue).toBe('<root disabled/>');
  });
});
