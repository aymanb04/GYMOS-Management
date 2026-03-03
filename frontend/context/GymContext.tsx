"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";

export interface Gym {
    id: string;
    name: string;
    subdomain: string;
    brand_color: string;
}

interface GymContextType {
    gym: Gym | null;
    gymLoading: boolean;
    gymError: string | null;
}

const GymContext = createContext<GymContextType>({
    gym: null,
    gymLoading: true,
    gymError: null,
});

function extractSubdomain(hostname: string): string | null {
    const parts = hostname.split(".");
    if (parts.length >= 2 && parts[0] !== "www") {
        const isLocalhost = hostname === "localhost" || hostname.startsWith("localhost:");
        const isBareDomain = parts.length === 2 && !hostname.includes("localhost");
        if (!isLocalhost && !isBareDomain) {
            return parts[0];
        }
    }
    return null;
}

// Change this to 'tkgym' when testing TK Gym locally
//const DEV_SUBDOMAIN = "sga";
const DEV_SUBDOMAIN = process.env.NODE_ENV === "development" ? "sga" : null;

export function GymProvider({ children }: { children: ReactNode }) {
    const [gym, setGym]            = useState<Gym | null>(null);
    const [gymLoading, setLoading] = useState(true);
    const [gymError, setError]     = useState<string | null>(null);

    /*useEffect(() => {
        const hostname = window.location.hostname;
        const subdomain = extractSubdomain(hostname) ?? DEV_SUBDOMAIN;
        fetchGym(subdomain);
    }, []);*/
    useEffect(() => {
        const hostname = window.location.hostname;
        const subdomain = extractSubdomain(hostname);

        if (!subdomain) {
            if (process.env.NODE_ENV === "development") {
                fetchGym("sga");
            } else {
                // Production with no subdomain — no gym to load
                setLoading(false);
            }
            return;
        }

        fetchGym(subdomain);
    }, []);

    async function fetchGym(subdomain: string) {
        try {
            const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
            const res = await fetch(`${base}/gyms/resolve?subdomain=${subdomain}`);

            if (!res.ok) {
                setError(`Unknown gym: ${subdomain}`);
                setLoading(false);
                return;
            }

            const data: Gym = await res.json();
            setGym(data);

            document.documentElement.style.setProperty("--accent", data.brand_color);
            const hex = data.brand_color.replace("#", "");
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            document.documentElement.style.setProperty("--accent-glow",  `rgba(${r}, ${g}, ${b}, 0.13)`);
            document.documentElement.style.setProperty("--accent-subtle", `rgba(${r}, ${g}, ${b}, 0.06)`);
            document.documentElement.style.setProperty("--accent-border", `rgba(${r}, ${g}, ${b}, 0.2)`);

        } catch {
            setError("Could not load gym configuration.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <GymContext.Provider value={{ gym, gymLoading, gymError }}>
            {children}
        </GymContext.Provider>
    );
}

export function useGym(): GymContextType {
    return useContext(GymContext);
}