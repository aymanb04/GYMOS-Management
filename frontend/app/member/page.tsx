"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGym } from "@/context/GymContext";
import { api } from "@/lib/api";

interface MemberProfile {
    id: string;
    name: string;
    email: string;
    active: boolean;
    membership_expires_at: string | null;
    membership_plan: {
        name: string;
        price: number;
        duration_months: number;
    } | null;
}

interface GymClass {
    id: string;
    title: string;
    schedule: string;
    capacity: number;
    description: string | null;
    duration_minutes: number | null;
    instructor: string | null;
}

function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("nl-BE", {
        day: "numeric", month: "long", year: "numeric",
    });
}

function formatClassDate(iso: string) {
    return new Date(iso).toLocaleDateString("nl-BE", {
        weekday: "short", day: "numeric", month: "short",
    });
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("nl-BE", {
        hour: "2-digit", minute: "2-digit",
    });
}

function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

type Tab = "membership" | "classes";

export default function MemberPage() {
    const { user, logout } = useAuth();
    const { gym } = useGym();

    const [profile, setProfile]   = useState<MemberProfile | null>(null);
    const [classes, setClasses]   = useState<GymClass[]>([]);
    const [loading, setLoading]   = useState(true);
    const [tab, setTab]           = useState<Tab>("membership");

    useEffect(() => {
        Promise.all([
            api.get<MemberProfile>("/members/me"),
            api.get<GymClass[]>("/classes"),
        ])
            .then(([profileRes, classesRes]) => {
                setProfile(profileRes.data);
                setClasses(classesRes.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const days = daysUntil(profile?.membership_expires_at ?? null);
    const isExpired = days !== null && days < 0;
    const isExpiringSoon = days !== null && days >= 0 && days <= 7;

    const avatarInitials = user?.name
        ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
        : "?";

    if (loading) {
        return <div className="spinner-wrap"><div className="spinner" /></div>;
    }

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
            {/* ── TOP BAR ── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "20px 32px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface)",
            }}>
                <div className="logo" style={{ fontSize: 16 }}>{gym?.name ?? "GymOS"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: "var(--accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "Barlow Condensed, sans-serif",
                        fontWeight: 700, fontSize: 13, color: "var(--bg)",
                    }}>
                        {avatarInitials}
                    </div>
                    <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{user?.name}</span>
                    <button onClick={logout} style={{
                        background: "none", border: "1px solid var(--border)",
                        borderRadius: 6, padding: "6px 12px",
                        fontSize: 12, color: "var(--muted2)", cursor: "pointer",
                        fontFamily: "DM Sans, sans-serif",
                    }}>Sign out</button>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={{ flex: 1, padding: "48px 32px", maxWidth: 640, margin: "0 auto", width: "100%" }}>

                {/* Greeting */}
                <p className="eyebrow" style={{ marginBottom: 8 }}>Member portal</p>
                <h1 className="hero-title" style={{ fontSize: "clamp(40px, 5vw, 64px)", marginBottom: 32 }}>
                    Hey, <span className="hi">{user?.name?.split(" ")[0]}.</span>
                </h1>

                {/* ── DEACTIVATED ── */}
                {profile && !profile.active ? (
                    <div style={{
                        background: "var(--surface)", border: "1px solid var(--danger-border)",
                        borderRadius: 16, padding: 32, position: "relative", overflow: "hidden",
                    }}>
                        <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 3,
                            background: "var(--danger)",
                        }} />
                        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
                        <div style={{
                            fontFamily: "Barlow Condensed, sans-serif",
                            fontWeight: 900, fontSize: 28, color: "var(--danger)", marginBottom: 12,
                        }}>Account deactivated</div>
                        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
                            Your account has been deactivated. Please contact {gym?.name ?? "your gym"} to resolve this.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── TABS ── */}
                        <div style={{
                            display: "flex", gap: 4, marginBottom: 24,
                            background: "var(--surface)", borderRadius: 10,
                            padding: 4, border: "1px solid var(--border)",
                            width: "fit-content",
                        }}>
                            {(["membership", "classes"] as Tab[]).map((t) => (
                                <button key={t} onClick={() => setTab(t)} style={{
                                    padding: "8px 20px", borderRadius: 7,
                                    background: tab === t ? "var(--accent)" : "transparent",
                                    color: tab === t ? "var(--bg)" : "var(--muted)",
                                    border: "none", cursor: "pointer",
                                    fontFamily: "DM Sans, sans-serif",
                                    fontWeight: tab === t ? 600 : 400,
                                    fontSize: 14, transition: "all .2s",
                                    textTransform: "capitalize",
                                }}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* ── MEMBERSHIP TAB ── */}
                        {tab === "membership" && (
                            <>
                                <div style={{
                                    background: "var(--surface)", border: "1px solid var(--border)",
                                    borderRadius: 16, padding: 32, marginBottom: 16,
                                    position: "relative", overflow: "hidden",
                                }}>
                                    <div style={{
                                        position: "absolute", top: 0, left: 0, right: 0, height: 3,
                                        background: isExpired ? "var(--danger)" : "linear-gradient(90deg, var(--accent), transparent)",
                                    }} />
                                    <div className="kpi-label" style={{ marginBottom: 16 }}>Membership</div>

                                    {profile?.membership_plan ? (
                                        <>
                                            <div style={{
                                                fontFamily: "Barlow Condensed, sans-serif",
                                                fontWeight: 900, fontSize: 36,
                                                color: "var(--text)", marginBottom: 4,
                                            }}>
                                                {profile.membership_plan.name}
                                            </div>
                                            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
                                                €{profile.membership_plan.price} /{" "}
                                                {profile.membership_plan.duration_months === 1 ? "month" : `${profile.membership_plan.duration_months} months`}
                                            </div>

                                            {isExpired ? (
                                                <div style={{
                                                    background: "var(--danger-subtle)", border: "1px solid var(--danger-border)",
                                                    borderRadius: 10, padding: "14px 18px", color: "var(--danger)", fontSize: 14,
                                                }}>
                                                    ⚠ Expired on {formatDate(profile.membership_expires_at)}. Contact your gym to renew.
                                                </div>
                                            ) : isExpiringSoon ? (
                                                <div style={{
                                                    background: "rgba(255,180,0,0.06)", border: "1px solid rgba(255,180,0,0.2)",
                                                    borderRadius: 10, padding: "14px 18px", color: "#FFB400", fontSize: 14,
                                                }}>
                                                    ⏳ Expires in {days} day{days !== 1 ? "s" : ""} — {formatDate(profile.membership_expires_at)}
                                                </div>
                                            ) : (
                                                <div style={{
                                                    background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
                                                    borderRadius: 10, padding: "14px 18px", color: "var(--accent)", fontSize: 14,
                                                }}>
                                                    ✓ Active until {formatDate(profile.membership_expires_at)}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ color: "var(--muted)", fontSize: 14 }}>
                                            No membership plan assigned yet. Contact your gym.
                                        </div>
                                    )}
                                </div>

                                {/* Account card */}
                                <div style={{
                                    background: "var(--surface)", border: "1px solid var(--border)",
                                    borderRadius: 16, padding: 24,
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                }}>
                                    <div>
                                        <div className="kpi-label" style={{ marginBottom: 4 }}>Account</div>
                                        <div style={{ fontSize: 14, color: "var(--text-dim)" }}>{user?.email}</div>
                                    </div>
                                    <span className="badge active">active</span>
                                </div>
                            </>
                        )}

                        {/* ── CLASSES TAB ── */}
                        {tab === "classes" && (
                            <div>
                                {classes.length === 0 ? (
                                    <div style={{
                                        textAlign: "center", padding: "60px 20px",
                                        color: "var(--muted2)", fontSize: 14,
                                        background: "var(--surface)", borderRadius: 16,
                                        border: "1px solid var(--border)",
                                    }}>
                                        No upcoming classes scheduled.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {classes.map((c) => (
                                            <div key={c.id} style={{
                                                background: "var(--surface)", border: "1px solid var(--border)",
                                                borderRadius: 14, padding: "18px 20px",
                                                display: "flex", alignItems: "center", gap: 16,
                                            }}>
                                                {/* Date block */}
                                                <div style={{
                                                    minWidth: 48, textAlign: "center",
                                                    background: "var(--accent-subtle)",
                                                    border: "1px solid var(--accent-border)",
                                                    borderRadius: 10, padding: "6px 4px",
                                                }}>
                                                    <div style={{
                                                        fontFamily: "Barlow Condensed, sans-serif",
                                                        fontWeight: 700, fontSize: 20,
                                                        color: "var(--accent)", lineHeight: 1,
                                                    }}>
                                                        {new Date(c.schedule).getDate()}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "var(--muted2)", textTransform: "uppercase" }}>
                                                        {new Date(c.schedule).toLocaleDateString("nl-BE", { month: "short" })}
                                                    </div>
                                                </div>

                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontFamily: "Barlow Condensed, sans-serif",
                                                        fontWeight: 700, fontSize: 17,
                                                        color: "var(--text)", textTransform: "uppercase", marginBottom: 2,
                                                    }}>
                                                        {c.title}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                                                        <span>{formatClassDate(c.schedule)} · {formatTime(c.schedule)}</span>
                                                        {c.duration_minutes && <span>· {c.duration_minutes} min</span>}
                                                        {c.instructor && <span>· {c.instructor}</span>}
                                                    </div>
                                                </div>

                                                <div style={{
                                                    fontSize: 12, color: "var(--muted2)",
                                                    textAlign: "right", flexShrink: 0,
                                                }}>
                                                    {c.capacity} spots
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}