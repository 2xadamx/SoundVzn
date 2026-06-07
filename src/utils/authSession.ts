const ACCESS_KEY = 'svzn_token';
const REFRESH_KEY = 'svzn_refresh';
const LEGACY_KEY = 'auth_access_token';

function looksLikeJwt(token: string | null): token is string {
    return !!token && token.length < 4096 && token.split('.').length === 3;
}

export function getAccessToken(): string | null {
    const token = localStorage.getItem(ACCESS_KEY) || localStorage.getItem(LEGACY_KEY);
    if (!looksLikeJwt(token)) {
        if (token) clearAccessToken();
        return null;
    }
    return token;
}

export function setSessionTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.removeItem(LEGACY_KEY);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearAccessToken() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(LEGACY_KEY);
}

export function clearSession() {
    clearAccessToken();
    localStorage.removeItem(REFRESH_KEY);
}

let refreshInFlight: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        const refresh = localStorage.getItem(REFRESH_KEY);
        if (!refresh) return null;

        try {
            const res = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-SoundVzn-Identity': 'SVZN-CORE-AUTH',
                },
                body: JSON.stringify({ refresh_token: refresh }),
            });
            if (!res.ok) return null;

            const data = await res.json();
            if (!data.access_token) return null;

            setSessionTokens(data.access_token, data.refresh_token);
            if (data.user) {
                localStorage.setItem('svzn_user', JSON.stringify(data.user));
            }
            return data.access_token as string;
        } catch {
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

/** Re-emite tokens en dev cuando la sesión local quedó desincronizada con el backend. */
export async function tryDevSessionRestore(): Promise<string | null> {
    if (!import.meta.env?.DEV) return null;
    const cached = localStorage.getItem('svzn_user');
    if (!cached) return null;

    let email: string | undefined;
    try {
        email = JSON.parse(cached)?.email;
    } catch {
        return null;
    }
    if (!email) return null;

    try {
        const res = await fetch('/api/auth/dev-restore', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-SoundVzn-Identity': 'SVZN-CORE-AUTH',
            },
            body: JSON.stringify({ email }),
        });
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.access_token) return null;

        setSessionTokens(data.access_token, data.refresh_token);
        if (data.user) {
            localStorage.setItem('svzn_user', JSON.stringify(data.user));
        }
        return data.access_token as string;
    } catch {
        return null;
    }
}

export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
        'X-SoundVzn-Identity': 'SVZN-CORE-AUTH',
        ...extra,
    };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

/** Helper: fetch with a hard timeout so requests never hang forever. */
function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 8000): Promise<Response> {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), ms);
    const mergedSignal = init.signal
        ? (() => {
              // If caller passed their own signal, abort on either
              const merged = new AbortController();
              init.signal.addEventListener('abort', () => merged.abort());
              controller.signal.addEventListener('abort', () => merged.abort());
              return merged.signal;
          })()
        : controller.signal;
    return fetch(input, { ...init, signal: mergedSignal }).finally(() => clearTimeout(tid));
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const buildInit = (token: string | null) => {
        const headers = new Headers(init.headers);
        headers.set('X-SoundVzn-Identity', 'SVZN-CORE-AUTH');
        if (token) headers.set('Authorization', `Bearer ${token}`);
        else headers.delete('Authorization');
        return { ...init, headers };
    };

    let response = await fetchWithTimeout(input, buildInit(getAccessToken()), 10000);
    if (response.status !== 401 && response.status !== 403) return response;

    const refreshed = await refreshAccessToken();
    if (refreshed) {
        response = await fetchWithTimeout(input, buildInit(refreshed), 10000);
        if (response.ok || (response.status !== 401 && response.status !== 403)) {
            return response;
        }
    }

    const restored = await tryDevSessionRestore();
    if (restored) {
        response = await fetchWithTimeout(input, buildInit(restored), 10000);
        if (response.ok || (response.status !== 401 && response.status !== 403)) {
            return response;
        }
    }

    clearAccessToken();
    response = await fetchWithTimeout(input, buildInit(null), 10000);
    return response;
}

/** Fetch sin credenciales — proxies públicos (Deezer, Spotify browse). */
export async function publicFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('X-SoundVzn-Identity', 'SVZN-CORE-AUTH');
    headers.delete('Authorization');
    return fetchWithTimeout(input, { ...init, headers }, 8000);
}
