"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface Stats {
    gymName: string;
    memberCount: number;
    monthlyRevenue: number;
    checkinsToday: number;
}

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    created_at: string;
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

    const [stats, setStats]     = useState<Stats | null>(null);
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

        const gymId = user.gym_id;

        Promise.all([
            api.get<Stats>(`/gyms/${gymId}/stats`),
            api.get<Member[]>(`/gyms/${gymId}/members`),
        ])
            .then(([statsRes, membersRes]) => {
                setStats(statsRes.data);
                setMembers(membersRes.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user?.gym_id]);

    if (loading) {
        return (
            <div className="spinner-wrap">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="dash-header">
                <div>
                    <div className="dash-title">Overview</div>
                    {stats?.gymName && (
                        <div
                            style={{
                                fontSize: 13,
                                color: "var(--muted2)",
                                marginTop: 4,
                                letterSpacing: "0.05em",
                            }}
                        >
                            {stats.gymName}
                        </div>
                    )}
                </div>
                <div className="dash-date">{today}</div>
            </div>

            {/* KPIs */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Active Members</div>
                    <div className="kpi-val">{stats?.memberCount ?? 0}</div>
                    <div className="kpi-delta">↑ this month</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label">Monthly Revenue</div>
                    <div className="kpi-val">
                        {formatEuro(stats?.monthlyRevenue ?? 0)}
                    </div>
                    <div className="kpi-delta">paid invoices</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label">Check-ins Today</div>
                    <div className="kpi-val">{stats?.checkinsToday ?? 0}</div>
                    <div className="kpi-delta">attended reservations</div>
                </div>
            </div>

            {/* Members table */}
            <div className="dash-grid2">
                <div>
                    <div className="section-head">
                        <span className="section-title">Recent Members</span>
                        <span className="section-link">View all →</span>
                    </div>

                    <div className="member-table">
                        <div className="mt-header cols-3">
                            <div className="mt-col">Name</div>
                            <div className="mt-col">Status</div>
                            <div className="mt-col">Joined</div>
                        </div>

                        {members.length === 0 ? (
                            <div
                                style={{
                                    padding: "32px 20px",
                                    textAlign: "center",
                                    color: "var(--muted2)",
                                    fontSize: 14,
                                }}
                            >
                                No members yet.
                            </div>
                        ) : (
                            members.map((m) => (
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
                                    <div
                                        style={{ fontSize: 12, color: "var(--muted2)" }}
                                    >
                                        {formatDate(m.created_at)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Activity feed placeholder */}
                <div>
                    <div className="section-head">
                        <span className="section-title">Activity</span>
                    </div>
                    <div className="activity-panel">
                        {[
                            { text: `${members[0]?.name ?? "A member"} checked in`, time: "just now" },
                            { text: "Monthly revenue updated", time: "1 hr ago" },
                            { text: "New member registered", time: "2 hrs ago" },
                            { text: "Membership plan renewed", time: "3 hrs ago" },
                            { text: "Class at capacity", time: "4 hrs ago" },
                        ].map((a, i) => (
                            <div key={i} className="act-item">
                                <div className="act-dot" />
                                <div>
                                    <div className="act-text">{a.text}</div>
                                    <div className="act-time">{a.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}