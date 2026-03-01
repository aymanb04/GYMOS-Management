"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthTokens, clearAuthTokens } from '@/lib/api';

export interface User {
    id: string;
    email: string;
    name: string;
    gym_id: string;
    role: 'admin' | 'coach' | 'member';
    active: boolean;
    membership_plan_id: string | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser]       = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { accessToken, user: profile } = res.data;

        // Persist token (localStorage + cookie for middleware)
        setAuthTokens(accessToken);
        // Cache user profile so page refreshes don't need /auth/me
        localStorage.setItem('gymos_user', JSON.stringify(profile));

        setUser(profile);

        // Role-based redirect
        if (profile.role === 'admin' || profile.role === 'coach') {
            router.push('/dashboard');
        } else {
            router.push('/member');
        }
    };

    const logout = () => {
        clearAuthTokens();
        localStorage.removeItem('gymos_user');
        setUser(null);
        router.push('/login');
    };

    // Restore session on page load
    useEffect(() => {
        const token = localStorage.getItem('accessToken');

        if (!token) {
            setLoading(false);
            return;
        }

        // Try to restore from cache first (instant, no network)
        const cached = localStorage.getItem('gymos_user');
        if (cached) {
            try {
                setUser(JSON.parse(cached));
            } catch {
                // Corrupt cache — clear it, continue to /auth/me call
                localStorage.removeItem('gymos_user');
            }
        }

        // Always verify token is still valid in the background
        // If /auth/me exists on backend: refreshes user data silently
        // If not yet deployed: cached user stays, no logout
        api
            .get('/auth/me')
            .then((res) => {
                setUser(res.data);
                localStorage.setItem('gymos_user', JSON.stringify(res.data));
            })
            .catch((err) => {
                // Only log out if token is explicitly rejected (401)
                // 404 means /auth/me not deployed yet — keep cached user
                if (err?.response?.status === 401) {
                    clearAuthTokens();
                    localStorage.removeItem('gymos_user');
                    setUser(null);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}