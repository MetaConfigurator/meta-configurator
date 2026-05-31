import type {AiBackendCorsEndpoint, AiBackendRelay} from '@/settings/settingsTypes';

export function throwAiRequestError(
  error: any,
  backend: AiBackendCorsEndpoint | AiBackendRelay
): never {
  const status: number | undefined = error?.response?.status;
  const machineMessage: string =
    error?.response?.data?.error?.message ?? error?.message ?? String(error);

  const raise = (userMessage: string): never => {
    throw new Error(`${userMessage}\n\nDetails: ${machineMessage}`);
  };

  if (status === 401) {
    return raise(
      'The API key was rejected (401 Unauthorized). Please check that the key you entered is correct and has not expired.'
    );
  }

  if (status === 403) {
    return raise(
      'Access was denied (403 Forbidden). Your API key may not have permission to use this model or endpoint.'
    );
  }

  if (status === 404) {
    return raise(
      'The endpoint or model could not be found (404). Double-check the endpoint URL and model name in your AI settings.'
    );
  }

  if (status === 400) {
    return raise(
      'The request was rejected by the API (400 Bad Request). A model parameter is likely wrong or not supported by the selected model. ' +
        'For example, some models use "max_completion_tokens" instead of "max_tokens". Check your custom model parameters in the AI settings.'
    );
  }

  if (status === 429) {
    return raise(
      'The API rate limit has been hit (429 Too Many Requests). Please wait a moment before trying again, or check your usage quota with the provider.'
    );
  }

  if (status !== undefined && status >= 500) {
    return raise(
      `The AI provider returned a server error (${status}). This is likely a temporary issue on their end — try again in a moment.`
    );
  }

  // No response received — network-level failure (CORS, mixed content, unreachable host)
  if (!error?.response) {
    const usingRelay = 'relay' in backend;
    const pageIsHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

    if (usingRelay && (backend as AiBackendRelay).relay.startsWith('http://') && pageIsHttps) {
      return raise(
        'Cannot reach the relay: your relay URL uses HTTP but MetaConfigurator is served over HTTPS. ' +
          'Browsers block mixed-content requests, so the relay must also use HTTPS in this setup.'
      );
    }

    if (!usingRelay && pageIsHttps) {
      return raise(
        'Could not reach the AI provider. This is most likely a CORS issue: most providers do not allow direct requests from a browser. ' +
          'Try switching to an HTTPS Relay, or use a provider that supports CORS (OpenAI or Perplexity).'
      );
    }

    return raise(
      'Could not connect to the AI endpoint. Check your network connection and make sure the URL in your AI settings is correct and reachable.'
    );
  }

  return raise('An unexpected error occurred while contacting the AI API.');
}
