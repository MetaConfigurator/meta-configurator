import {getErrorMessage} from '@/utility/getErrorMessage';

type BackendJsonRequest = {
  baseUrl: string;
  endpointPath: string;
  requestBody: unknown;
  serviceName: string;
};

/** Sends a JSON POST request and turns transport and backend errors into user-facing messages. */
export async function postJsonToBackend({
  baseUrl,
  endpointPath,
  requestBody,
  serviceName,
}: BackendJsonRequest): Promise<unknown> {
  const serializedRequestBody = serializeRequestBody(requestBody, serviceName);
  const response = await sendRequest(baseUrl, endpointPath, serializedRequestBody, serviceName);
  const responseBody = await readJsonResponse(response, serviceName);

  if (!response.ok) {
    const backendError =
      isObjectRecord(responseBody) && typeof responseBody.error === 'string'
        ? responseBody.error
        : `${capitalize(serviceName)} request failed with status ${response.status}.`;
    throw new Error(backendError);
  }

  return responseBody;
}

function serializeRequestBody(requestBody: unknown, serviceName: string): string {
  try {
    return JSON.stringify(requestBody);
  } catch (error) {
    throw new Error(`Could not serialize the ${serviceName} request. (${getErrorMessage(error)})`);
  }
}

async function sendRequest(
  baseUrl: string,
  endpointPath: string,
  serializedRequestBody: string,
  serviceName: string
): Promise<Response> {
  try {
    return await fetch(`${baseUrl}${endpointPath}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: serializedRequestBody,
    });
  } catch (error) {
    throw new Error(
      `Could not reach the ${serviceName} at ${baseUrl}. ` +
        `Please make sure the service is running and reachable. ` +
        `(${getErrorMessage(error)})`
    );
  }
}

async function readJsonResponse(response: Response, serviceName: string): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const responseText = await response.text().catch(() => '');
    throw new Error(
      `Unexpected response from the ${serviceName} (status ${response.status}). ` +
        (responseText ? `Response: ${responseText.slice(0, 300)}` : 'The response was not JSON.')
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      `${capitalize(serviceName)} returned invalid JSON (status ${response.status}). ` +
        `(${getErrorMessage(error)})`
    );
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
