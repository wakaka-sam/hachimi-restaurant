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

export async function requestJson<T>(url: string, options: JsonRequestOptions): Promise<JsonResponse<T>> {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  if (typeof globalThis.fetch === 'function') {
    const response = await globalThis.fetch(url, {
      method: options.method,
      headers: options.headers,
      body
    });
    return {
      ok: response.ok,
      status: response.status,
      payload: await response.json() as T
    };
  }
  return requestJsonWithXhr(url, options, body);
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
          payload: JSON.parse(xhr.responseText || '{}') as T
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
