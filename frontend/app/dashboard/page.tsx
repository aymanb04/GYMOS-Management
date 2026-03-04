"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGym } from "@/context/GymContext";
import { api } from "@/lib/api";

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    created_at: string;
    membership_expires_at: string | null;
}

function formatEuro(amount: number) {
    return new Intl.NumberFormat("nl-BE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("nl-BE", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function DashboardPage() {
    const { user } = useAuth();
    const { gym } = useGym();

    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const today = new Date().toLocaleDateString("en-BE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    useEffect(() => {
        if (!user?.gym_id) return;

        api.get<Member[]>("/members")
            .then((res) => setMembers(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user?.gym_id]);

    const activeCount   = members.filter((m) => m.active).length;
    const inactiveCount = members.filter((m) => !m.active).length;
    const expiringCount = members.filter(
        (m) => m.active && m.membership_expires_at &&
            new Date(m.membership_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length;

    if (loading) {
        return (
            <div className="spinner-wrap">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <>
            {/* ── HEADER ── */}
            <div className="dash-header">
                <div>
                    <div className="dash-title">Overview</div>
                    {gym?.name && (
                        <div style={{
                            fontSize: 13, color: "var(--muted2)",
                            marginTop: 4, letterSpacing: "0.05em",
                        }}>
                            {gym.name}
                        </div>
                    )}
                </div>
                <div className="dash-date">{today}</div>
            </div>

            {/* ── KPIs ── */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Total Members</div>
                    <div className="kpi-val">{members.length}</div>
                    <div className="kpi-delta">{activeCount} active</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label">Inactive Members</div>
                    <div className="kpi-val">{inactiveCount}</div>
                    <div className="kpi-delta">deactivated accounts</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label">Expiring Soon</div>
                    <div className="kpi-val">{expiringCount}</div>
                    <div className="kpi-delta">within 7 days</div>
                </div>
            </div>

            {/* ── RECENT MEMBERS ── */}
            <div className="dash-grid2">
                <div>
                    <div className="section-head">
                        <span className="section-title">Recent Members</span>
                        <a href="/dashboard/members" className="section-link">View all →</a>
                    </div>

                    <div className="member-table">
                        <div className="mt-header cols-3">
                            <div className="mt-col">Name</div>
                            <div className="mt-col">Status</div>
                            <div className="mt-col">Joined</div>
                        </div>

                        {members.length === 0 ? (
                            <div style={{
                                padding: "32px 20px", textAlign: "center",
                                color: "var(--muted2)", fontSize: 14,
                            }}>
                                No members yet.
                            </div>
                        ) : (
                            members.slice(0, 8).map((m) => (
                                <div key={m.id} className="mt-row cols-3">
                                    <div>
                                        <div className="mt-name">{m.name}</div>
                                        <div className="mt-email">{m.email}</div>
                                    </div>
                                    <div>
                                        <span className={`badge ${m.active ? "active" : "inactive"}`}>
                                            {m.active ? "active" : "inactive"}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--muted2)" }}>
                                        {formatDate(m.created_at)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── ACTIVITY ── */}
                <div>
                    <div className="section-head">
                        <span className="section-title">Activity</span>
                    </div>
                    <div className="activity-panel">
                        {expiringCount > 0 && (
                            <div className="act-item">
                                <div className="act-dot" style={{ background: "var(--danger)" }} />
                                <div>
                                    <div className="act-text">{expiringCount} membership{expiringCount !== 1 ? "s" : ""} expiring soon</div>
                                    <div className="act-time">within 7 days</div>
                                </div>
                            </div>
                        )}
                        {members.slice(0, 4).map((m, i) => (
                            <div key={i} className="act-item">
                                <div className="act-dot" />
                                <div>
                                    <div className="act-text">{m.name} joined</div>
                                    <div className="act-time">{formatDate(m.created_at)}</div>
                                </div>
                            </div>
                        ))}
                        {members.length === 0 && (
                            <div style={{ color: "var(--muted2)", fontSize: 14, padding: "20px 0" }}>
                                No recent activity.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}