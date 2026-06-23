export interface JsonRequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface JsonResponse<T> {
  ok: boolean;
  status: number;
  payload: T;
}

export class NonJsonResponseError extends Error {
  readonly url: string;
  readonly status: number;
  readonly contentType: string;
  readonly bodyPreview: string;

  constructor(url: string, status: number, contentType: string, body: string) {
    super('API endpoint did not return JSON.');
    this.name = 'NonJsonResponseError';
    this.url = url;
    this.status = status;
    this.contentType = contentType;
    this.bodyPreview = body.slice(0, 120);
  }
}

export async function requestJson<T>(url: string, options: JsonRequestOptions): Promise<JsonResponse<T>> {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  if (typeof globalThis.fetch === 'function') {
    const response = await globalThis.fetch(url, {
      method: options.method,
      headers: options.headers,
      body
    });
    const responseText = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      payload: parseJsonPayload<T>(
        responseText,
        url,
        response.status,
        response.headers.get('content-type') || ''
      )
    };
  }
  return requestJsonWithXhr(url, options, body);
}

function parseJsonPayload<T>(text: string, url: string, status: number, contentType: string): T {
  try {
    return JSON.parse(text || '{}') as T;
  } catch {
    throw new NonJsonResponseError(url, status, contentType, text);
  }
}

function requestJsonWithXhr<T>(
  url: string,
  options: JsonRequestOptions,
  body: string | undefined
): Promise<JsonResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, url, true);
    xhr.timeout = 15000;
    for (const [key, value] of Object.entries(options.headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.onload = () => {
      try {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          payload: parseJsonPayload<T>(
            xhr.responseText || '{}',
            url,
            xhr.status,
            xhr.getResponseHeader('content-type') || ''
          )
        });
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new Error('Network request failed.'));
    xhr.ontimeout = () => reject(new Error('Network request timed out.'));
    xhr.send(body || null);
  });
}
