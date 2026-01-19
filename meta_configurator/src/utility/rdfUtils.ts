import type {Path} from './path';

export function downloadFile(
  serialized: {content: string; success: boolean; errorMessage: string},
  format: string
) {
  const blob = new Blob([serialized.content], {type: format});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Data.${getFileExtension(format)}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function areJsonLdPathsEqual(path1: Path, path2: Path): boolean {
  if (path1.length !== path2.length) {
    return false;
  }

  for (let i = 0; i < path1.length; i++) {
    if (path1[i] !== path2[i]) {
      return false;
    }
  }

  return true;
}

function getFileExtension(format: string): string {
  switch (format) {
    case 'text/turtle':
      return 'ttl';
    case 'application/n-triples':

    case 'text/plain':
      return 'nt';

    case 'application/ld+json':
      return 'jsonld';

    case 'application/rdf+xml':
      return 'rdf';

    default:
      return 'txt';
  }
}
