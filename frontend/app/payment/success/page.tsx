"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGym } from "@/context/GymContext";

export default function PaymentSuccessPage() {
    const router = useRouter();
    const { gym } = useGym();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) { clearInterval(interval); router.push("/member"); return 0; }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [router]);

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: 40, maxWidth: 480 }}>
                <div style={{ fontSize: 64, marginBottom: 24 }}>✓</div>
                <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 900, fontSize: 48, color: "var(--accent)", marginBottom: 8 }}>
                    Payment successful!
                </h1>
                <p style={{ fontSize: 16, color: "var(--muted)", marginBottom: 8 }}>
                    Your membership at {gym?.name ?? "your gym"} is now active.
                </p>
                <p style={{ fontSize: 13, color: "var(--muted2)" }}>
                    Redirecting in {countdown}s...
                </p>
                <button onClick={() => router.push("/member")} style={{
                    marginTop: 32, padding: "14px 32px", borderRadius: 10,
                    background: "var(--accent)", color: "var(--bg)",
                    border: "none", fontSize: 15, fontFamily: "DM Sans, sans-serif",
                    fontWeight: 600, cursor: "pointer",
                }}>
                    Go to my account →
                </button>
            </div>
        </div>
    );
}