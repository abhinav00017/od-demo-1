/** Small fetch helpers for the CRM screens. Every call is JSON, uncached, and turns a 401 into "log in again". */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
  get fieldErrors(): Record<string, string> {
    return (this.body.fieldErrors as Record<string, string> | undefined) ?? {};
  }
}

let onUnauthorised: () => void = () => undefined;

/** The app sets this once, so any screen that hits a 401 sends the user back to the login form. */
export function setUnauthorisedHandler(fn: () => void) {
  onUnauthorised = fn;
}

export async function api<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      cache: "no-store",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401) onUnauthorised();
  if (!res.ok || body.ok === false) throw new ApiError(typeof body.error === "string" ? body.error : "Something went wrong. Try again.", res.status, body);
  return body as T;
}
