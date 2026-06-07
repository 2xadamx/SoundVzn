import { create } from 'zustand';
import { api } from '../utils/api';
import { clearAccessToken, getAccessToken, refreshAccessToken, tryDevSessionRestore } from '../utils/authSession';
import { sanitizeUserAvatar } from '../utils/imageUrl';

interface User {
    id: string;
    svzn_id: number;
    name: string;
    email: string;
    tier: string;
    avatar?: string;
    banner?: string;
    username?: string;
    bio?: string;
    anthem?: any;
    genres?: string[];
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isInitialized: boolean;
    setUser: (user: User | null) => void;
    refreshUser: () => Promise<User | null>;
    updateProfile: (data: Partial<User>) => Promise<boolean>;
    logout: () => void;
    initialize: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: !!getAccessToken(),
    isInitialized: false,

    setUser: (user) => {
        if (user) {
            const safe = sanitizeUserAvatar(user);
            localStorage.setItem('svzn_user', JSON.stringify(safe));
            set({ user: safe, isAuthenticated: true });
        } else {
            localStorage.removeItem('svzn_user');
            set({ user: null, isAuthenticated: false });
        }
    },

    refreshUser: async () => {
        let token = getAccessToken();
        if (!token) {
            token = await refreshAccessToken();
        }
        if (!token) {
            token = await tryDevSessionRestore();
        }
        if (!token) {
            const cached = localStorage.getItem('svzn_user');
            if (cached) {
                const parsed = sanitizeUserAvatar(JSON.parse(cached));
                localStorage.setItem('svzn_user', JSON.stringify(parsed));
                set({ user: parsed, isAuthenticated: false, isInitialized: true });
                return parsed;
            }
            set({ user: null, isAuthenticated: false, isInitialized: true });
            return null;
        }

        try {
            const res = await api.get('/api/auth/me');
            const userData = sanitizeUserAvatar(res.data.user);
            if (userData) {
                localStorage.setItem('svzn_user', JSON.stringify(userData));
                
                const w = window as any;
                if (w.electron?.saveData) {
                    w.electron.saveData('auth_access_token', token);
                }
                
                import('../utils/database').then(db => db.updateProfile(userData));

                set({ user: userData, isAuthenticated: true, isInitialized: true });
                return userData;
            }
            return null;
        } catch (err: any) {
            console.warn('[AuthStore] Sync failed, clearing stale token.');
            clearAccessToken();

            const restored = await tryDevSessionRestore();
            if (restored) {
                try {
                    const res = await api.get('/api/auth/me');
                    const userData = sanitizeUserAvatar(res.data.user);
                    if (userData) {
                        localStorage.setItem('svzn_user', JSON.stringify(userData));
                        import('../utils/database').then(db => db.updateProfile(userData));
                        set({ user: userData, isAuthenticated: true, isInitialized: true });
                        return userData;
                    }
                } catch {
                    // fall through
                }
            }

            const cached = localStorage.getItem('svzn_user');
            if (cached) {
                const parsed = sanitizeUserAvatar(JSON.parse(cached));
                localStorage.setItem('svzn_user', JSON.stringify(parsed));
                set({ user: parsed, isAuthenticated: false, isInitialized: true });
                return parsed;
            }
            
            set({ isInitialized: true, isAuthenticated: false, user: null });
            return null;
        }
    },

    updateProfile: async (data) => {
        const token = localStorage.getItem('svzn_token') || localStorage.getItem('auth_access_token');
        if (!token) return false;

        try {
            await api.post('/api/auth/update-profile', data);
            
            // Re-fetch to ensure store is 100% in sync with server state
            await get().refreshUser();
            return true;
        } catch (err) {
            console.error('[AuthStore] Update failed:', err);
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('svzn_token');
        localStorage.removeItem('svzn_refresh');
        localStorage.removeItem('svzn_user');
        localStorage.removeItem('auth_access_token');
        set({ user: null, isAuthenticated: false });
        window.location.reload();
    },

    initialize: async () => {
        if (get().isInitialized) return;
        
        // Check cache first for instant UI
        const cached = localStorage.getItem('svzn_user');
        if (cached) {
            set({ user: JSON.parse(cached), isAuthenticated: !!getAccessToken() });
        }

        // Then verify with server
        await get().refreshUser();
    }
}));
