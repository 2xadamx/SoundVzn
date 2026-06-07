import axios from 'axios';
import { BACKEND_URL } from './apiConfig';
import { clearAccessToken, getAccessToken, refreshAccessToken, tryDevSessionRestore } from './authSession';

export const api = axios.create({
    baseURL: BACKEND_URL,
    timeout: 15000,
    withCredentials: false,
});

// REINFORCEMENT: Automatic Retry with Exponential Backoff
api.interceptors.response.use(undefined, async (err) => {
    const config = err.config;
    if (!config || !config.retry) return Promise.reject(err);
    
    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount >= config.retry) return Promise.reject(err);
    
    config.__retryCount += 1;
    const backoff = Math.pow(2, config.__retryCount) * 1000;
    console.warn(`[API] Retrying ${config.url} (${config.__retryCount}/${config.retry}) in ${backoff}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, backoff));
    return api(config);
});

api.interceptors.request.use(config => {
    const url = String(config.url || '');
    if (config.method === 'get' && !url.includes('/api/auth/me') && !url.includes('/api/health')) {
        (config as any).retry = 3;
    }
    return config;
});

// REQUEST INTERCEPTOR
api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-SoundVzn-Identity'] = 'SVZN-CORE-AUTH';
    return config;
}, (error) => {
    return Promise.reject(error);
});

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const url = String(originalRequest?.url || '');

        if ((status === 401 || status === 403) && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;

            let newToken = await refreshAccessToken();
            if (!newToken) {
                newToken = await tryDevSessionRestore();
            }
            if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            }

            clearAccessToken();
            if (!url.includes('/api/auth/me') && !url.includes('/api/deezer/') && !url.includes('/api/spotify/')) {
                window.dispatchEvent(new CustomEvent('svzn:auth_error', {
                    detail: { message: 'Sesión expirada. Por favor, inicia sesión de nuevo.' },
                }));
            }
        }

        if (!error.response || error.response.status >= 500) {
            window.dispatchEvent(new CustomEvent('svzn:network_error', { 
                detail: { message: 'Error de conexión con el servidor.' } 
            }));
        }

        return Promise.reject(error);
    }
);

export default api;
