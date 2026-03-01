"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface Gym {
    id: string;
    name: string;
    email: string | null;
}

function initials(name: string) {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
}

export default function GymSelectPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [gyms, setGyms]               = useState<Gym[]>([]);
    const [selected, setSelected]       = useState<string | null>(null);
    const [loading, setLoading]         = useState(true);
    const [submitting, setSubmitting]   = useState(false);
    const [error, setError]             = useState("");

    useEffect(() => {
        api
            .get<Gym[]>("/gyms")
            .then((res) => setGyms(res.data))
            .catch(() => setError("Could not load gyms. Please refresh."))
            .finally(() => setLoading(false));
    }, []);

    const handleConfirm = async () => {
        if (!selected) return;
        setSubmitting(true);
        try {
            // TODO: wire to PATCH /users/me/gym once that endpoint exists
            // await api.patch("/users/me/gym", { gymId: selected });
            router.push("/dashboard");
        } catch {
            setError("Could not switch gym. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const selectedName = gyms.find((g) => g.id === selected)?.name;

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "var(--bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 48,
            }}
        >
            <div style={{ width: "100%", maxWidth: 480 }}>

                {/* Header */}
                <div className="logo" style={{ marginBottom: 32 }}>GymOS</div>

                <h1 className="fh" style={{ marginBottom: 6 }}>
                    Switch
                    <br />
                    gym
                </h1>
                <p className="fs">
                    {user?.name ? `Hi ${user.name.split(" ")[0]}, select` : "Select"} a gym to continue.
                </p>

                {error && <div className="form-error">{error}</div>}

                {/* Gym list */}
                <div className="gym-list" style={{ maxHeight: "none", marginBottom: 24 }}>
                    {loading && (
                        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                            <div className="spinner" />
                        </div>
                    )}

                    {!loading && gyms.length === 0 && (
                        <p style={{ color: "var(--muted2)", fontSize: 14, textAlign: "center", padding: "32px 0" }}>
                            No gyms found. Contact your administrator.
                        </p>
                    )}

                    {!loading && gyms.map((gym) => (
                        <div
                            key={gym.id}
                            className={`gym-card ${selected === gym.id ? "selected" : ""}`}
                            onClick={() => setSelected(gym.id)}
                            style={{ padding: "18px 20px" }}
                        >
                            <div className="gym-avatar" style={{ width: 44, height: 44, fontSize: 14 }}>
                                {initials(gym.name)}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="gym-name-text" style={{ fontSize: 15 }}>{gym.name}</div>
                                {gym.email && (
                                    <div className="gym-meta">{gym.email}</div>
                                )}
                            </div>

                            <div className="gym-check">
                                <svg className="gym-check-mark" viewBox="0 0 10 10" fill="none">
                                    <path
                                        d="M2 5l2.5 2.5L8 3"
                                        stroke="var(--bg)"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    className="btn-primary"
                    disabled={!selected || submitting}
                    onClick={handleConfirm}
                >
                    {submitting
                        ? "Switching..."
                        : selected
                            ? `Open ${selectedName} →`
                            : "Select a gym →"}
                </button>

                <button
                    className="btn-ghost"
                    onClick={() => router.back()}
                    style={{ marginTop: 10 }}
                >
                    ← Back
                </button>
            </div>
        </div>
    );
}