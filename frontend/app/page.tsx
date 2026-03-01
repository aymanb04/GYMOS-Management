"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RootPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace("/login");
        } else {
            router.replace("/dashboard");
        }
    }, [user, loading, router]);

    // Brief blank screen while auth state resolves
    return null;
}