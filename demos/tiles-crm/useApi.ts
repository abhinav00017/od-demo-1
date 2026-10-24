import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

/** Loads a CRM endpoint when the screen mounts, and again on reload(). Old data stays on screen while it reloads. */
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; url?: string }>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    api<T>(url).then(
      (data) => alive && setState({ data, url }),
      (err: unknown) => alive && setState((s) => ({ ...s, error: err instanceof ApiError ? err.message : "Could not load this screen." })),
    );
    return () => {
      alive = false;
    };
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  // Data from another url (the screen moved on) does not count.
  const data = state.url === url ? state.data : undefined;
  return { data, error: state.error, reload, setData: (d: T) => setState({ data: d, url: url ?? undefined }) };
}
