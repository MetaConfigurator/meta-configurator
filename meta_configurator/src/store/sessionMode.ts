export enum SessionMode {
  DataEditor = 'dataEditor',
  SchemaEditor = 'schemaEditor',
  Settings = 'settings',
}

export function modeToDocumentTypeDescription(mode: SessionMode): string {
  switch (mode) {
    case SessionMode.DataEditor:
      return 'data';
    case SessionMode.SchemaEditor:
      return 'schema';
    case SessionMode.Settings:
      return 'settings';
  }
}
