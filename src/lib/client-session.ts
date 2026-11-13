"use client";

// ---------------------------------------------------------------------------
// Iframe-safe Client Session Token Store & Fetch Interceptor
// Guarantees Sign In works even inside cross-origin sandboxed iframes where
// third-party cookies or window.localStorage may be restricted by the browser.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "jobpulse_session_token";

let memoryToken: string | null = null;

export function getClientToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;

  try {
    const s = window.sessionStorage?.getItem(STORAGE_KEY);
    if (s) {
      memoryToken = s;
      return s;
    }
  } catch {
    /* ignore SecurityError in strict sandboxed iframes */
  }

  try {
    const l = window.localStorage?.getItem(STORAGE_KEY);
    if (l) {
      memoryToken = l;
      return l;
    }
  } catch {
    /* ignore SecurityError in strict sandboxed iframes */
  }

  return null;
}

export function setClientToken(token: string | null): void {
  memoryToken = token;
  if (typeof window === "undefined") return;

  try {
    if (token) window.sessionStorage?.setItem(STORAGE_KEY, token);
    else window.sessionStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }

  try {
    if (token) window.localStorage?.setItem(STORAGE_KEY, token);
    else window.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function ensureFetchAuthInterceptor(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __jobpulseFetchWrappedV2?: boolean };
  if (w.__jobpulseFetchWrappedV2) return;

  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const urlStr =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const isLocalApi =
        urlStr.startsWith("/api/") ||
        urlStr.includes("/api/");
      const tok = getClientToken();
      if (isLocalApi && tok) {
        const headers = new Headers(init?.headers);
        if (!headers.has("x-jobpulse-token")) {
          headers.set("x-jobpulse-token", tok);
        }
        return origFetch(input, {
          ...init,
          headers,
          credentials: init?.credentials ?? "include",
        });
      }
    } catch {
      /* never fail fetch if URL/header inspection throws */
    }
    return origFetch(input, init);
  };

  w.__jobpulseFetchWrappedV2 = true;
}

if (typeof window !== "undefined") {
  ensureFetchAuthInterceptor();
}
