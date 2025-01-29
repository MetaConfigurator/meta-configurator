function processUrl(url: string): string {
  // if url is GitHub URL, convert to raw source code URL
  if (url.includes('github.com')) {
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }

  return url;
}

export async function fetchExternalContent(url: string): Promise<Response> {
  return fetch(processUrl(url));
}

export async function fetchExternalContentText(url: string): Promise<string> {
  const sanitizedUrl = processUrl(url);
  const response = await fetch(sanitizedUrl, {
    headers: {
      Accept: 'text/plain', // Ensures we request plain text
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}, with url: ${sanitizedUrl}`);
  }

  return await response.text();
}
