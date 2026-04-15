import ace from 'brace';

const oop = ace.acequire('ace/lib/oop');
const TextMode = ace.acequire('ace/mode/text').Mode;
const TextHighlightRules = ace.acequire('ace/mode/text_highlight_rules').TextHighlightRules;

const SparqlHighlightRules = function (this: any) {
  const keywords =
    'SELECT|WHERE|ASK|CONSTRUCT|DESCRIBE|FROM|NAMED|PREFIX|BASE|' +
    'FILTER|OPTIONAL|GRAPH|UNION|BIND|VALUES|DISTINCT|REDUCED|' +
    'ORDER|BY|LIMIT|OFFSET|GROUP|HAVING|AS';

  const functions =
    'STR|LANG|LANGMATCHES|DATATYPE|BOUND|IRI|URI|BNODE|' +
    'RAND|ABS|CEIL|FLOOR|ROUND|CONCAT|SUBSTR|STRLEN|' +
    'UCASE|LCASE|ENCODE_FOR_URI|CONTAINS|STRSTARTS|STRENDS';

  this.$rules = {
    start: [
      {token: 'comment', regex: '#.*$'},
      {token: 'string', regex: '".*?"'},
      {token: 'string', regex: "'.*?'"},
      {token: 'constant.language', regex: '<[^>]*>'},
      {token: 'variable', regex: '\\?[a-zA-Z_][a-zA-Z0-9_]*'},
      {token: 'keyword', regex: '\\b(?:PREFIX|BASE)\\b'},
      {token: 'keyword.control', regex: '\\b(?:' + keywords + ')\\b', caseInsensitive: true},
      {token: 'support.function', regex: '\\b(?:' + functions + ')\\b', caseInsensitive: true},
      {token: 'constant.numeric', regex: '\\b[0-9]+\\b'},
      {token: 'keyword.operator', regex: '=|!=|<|>|<=|>=|&&|\\|\\|'},
      {token: 'paren.lparen', regex: '[\\(\\{\\[]'},
      {token: 'paren.rparen', regex: '[\\)\\}\\]]'},
      {token: 'text', regex: '\\s+'},
    ],
  };
};

oop.inherits(SparqlHighlightRules, TextHighlightRules);

export const SparqlCustomMode = function (this: any) {
  this.HighlightRules = SparqlHighlightRules;
} as any;
oop.inherits(SparqlCustomMode, TextMode);
(SparqlCustomMode as any).prototype.$id = 'ace/mode/sparql_custom';

const RmlHighlightRules = function (this: any) {
  const keywords =
    '@PREFIX|BASE|a|GRAPH|OPTIONAL|UNION|FILTER|BIND|VALUES|SELECT|WHERE|CONSTRUCT|ASK|DESCRIBE';

  this.$rules = {
    start: [
      {token: 'comment', regex: '#.*$'},
      {token: 'string', regex: '"(?:\\\\.|[^"\\\\])*"'},
      {token: 'string', regex: "'(?:\\\\.|[^'\\\\])*'"},
      {token: 'constant.language', regex: '<[^>]*>'},
      {token: 'variable', regex: '\\?[a-zA-Z_][a-zA-Z0-9_]*'},
      {token: 'entity.name.tag', regex: '@(?:prefix|base)\\b', caseInsensitive: true},
      {token: 'keyword.control', regex: '\\b(?:' + keywords + ')\\b', caseInsensitive: true},
      {token: 'constant.numeric', regex: '[+-]?(?:\\d+\\.\\d+|\\d+)(?:[eE][+-]?\\d+)?\\b'},
      {token: 'keyword.operator', regex: '=>|=|!=|<|>|<=|>=|&&|\\|\\|'},
      {token: 'paren.lparen', regex: '[\\(\\{\\[]'},
      {token: 'paren.rparen', regex: '[\\)\\}\\]]'},
      {token: 'punctuation.operator', regex: '[;,.]'},
      {token: 'text', regex: '\\s+'},
    ],
  };
};

oop.inherits(RmlHighlightRules, TextHighlightRules);

export const RmlCustomMode = function (this: any) {
  this.HighlightRules = RmlHighlightRules;
} as any;
oop.inherits(RmlCustomMode, TextMode);
(RmlCustomMode as any).prototype.$id = 'ace/mode/rml_custom';
