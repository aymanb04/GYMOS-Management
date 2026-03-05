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
    login: (email: string, password: string, gymId?: string) => Promise<void>;
    logout: () => void;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser]       = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const login = async (email: string, password: string, gymId?: string) => {
        const res = await api.post('/auth/login', { email, password, gymId });
        const { accessToken, user: profile } = res.data;

        setAuthTokens(accessToken);
        localStorage.setItem('gymos_user', JSON.stringify(profile));
        setUser(profile);

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

    const resetPassword = async (email: string) => {
        await api.post('/auth/reset-password', { email });
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');

        if (!token) {
            setLoading(false);
            return;
        }

        const cached = localStorage.getItem('gymos_user');
        if (cached) {
            try {
                setUser(JSON.parse(cached));
            } catch {
                localStorage.removeItem('gymos_user');
            }
        }

        api
            .get('/auth/me')
            .then((res) => {
                setUser(res.data);
                localStorage.setItem('gymos_user', JSON.stringify(res.data));
            })
            .catch((err) => {
                if (err?.response?.status === 401) {
                    clearAuthTokens();
                    localStorage.removeItem('gymos_user');
                    setUser(null);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}