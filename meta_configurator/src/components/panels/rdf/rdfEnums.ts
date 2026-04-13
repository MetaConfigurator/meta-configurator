export enum HttpProtocol {
  Http = 'http:',
  Https = 'https:',
}

export enum RdfProxyPath {
  Endpoint = '/api/rdf-proxy',
}

export enum RdfMediaType {
  RdfXml = 'application/rdf+xml',
  Xml = 'application/xml',
  TextXml = 'text/xml',
  Turtle = 'text/turtle',
  XTurtle = 'application/x-turtle',
  NTriples = 'application/n-triples',
  N3 = 'text/n3',
  JsonLd = 'application/ld+json',
  SchemaOrgJsonLd = 'application/vnd.schemaorg.ld+json',
  Json = 'application/json',
  TextPlain = 'text/plain',
  OctetStream = 'application/octet-stream',
  NQuads = 'application/n-quads',
}

export enum RdfPropertyType {
  DatatypeProperty = 'DatatypeProperty',
  ObjectProperty = 'ObjectProperty',
  Class = 'Class',
}

export enum RdfPropertyTypeIri {
  OwlObjectProperty = 'http://www.w3.org/2002/07/owl#ObjectProperty',
  OwlDatatypeProperty = 'http://www.w3.org/2002/07/owl#DatatypeProperty',
  RdfProperty = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property',
  RdfsClass = 'http://www.w3.org/2000/01/rdf-schema#Class',
  OwlClass = 'http://www.w3.org/2002/07/owl#Class',
}

export enum RdfPredicateIri {
  RdfsComment = 'http://www.w3.org/2000/01/rdf-schema#comment',
}

export enum RdfBindingName {
  About = 'about',
  PropertyType = 'propertyType',
  Comment = 'comment',
}

export enum RdfStatusSeverity {
  Success = 'success',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export enum OntologyExplorerTab {
  DatatypeProperty = 'DatatypeProperty',
  ObjectProperty = 'ObjectProperty',
  Class = 'Class',
  SPARQL = 'SPARQL',
}

export enum OntologyAccordionSection {
  Controls = 'ontologyControls',
}

export enum CustomQueryAccordionSection {
  Editor = 'editor',
}

export enum OntologySourceField {
  Predicate = 'Predicate',
  Object = 'Object',
}
