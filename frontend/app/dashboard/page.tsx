"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGym } from "@/context/GymContext";
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

interface PopularClass {
    id: string;
    title: string;
    day_of_week: number;
    time_of_day: string;
    instructor: string | null;
    count: number;
}

interface MemberActivity {
    id: string;
    name: string;
    email: string;
    count: number;
    label: "heavy" | "light" | "regular";
}

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

    const [stats, setStats]                   = useState<Stats | null>(null);
    const [members, setMembers]               = useState<Member[]>([]);
    const [popularClasses, setPopularClasses] = useState<PopularClass[]>([]);
    const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([]);
    const [loading, setLoading]               = useState(true);

    const today = new Date().toLocaleDateString("en-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    useEffect(() => {
        if (!user?.gym_id) return;
        const gymId = user.gym_id;

        Promise.all([
            api.get<Stats>(`/gyms/${gymId}/stats`),
            api.get<Member[]>(`/gyms/${gymId}/members`),
            api.get<PopularClass[]>(`/gyms/${gymId}/popular-classes`),
            api.get<MemberActivity[]>(`/gyms/${gymId}/member-activity`),
        ])
            .then(([statsRes, membersRes, classesRes, activityRes]) => {
                setStats(statsRes.data);
                setMembers(membersRes.data);
                setPopularClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
                setMemberActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user?.gym_id]);

    if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

    const maxCount = popularClasses[0]?.count ?? 1;
    const heavyMembers  = memberActivity.filter(m => m.label === "heavy");
    const lightMembers  = memberActivity.filter(m => m.label === "light");

    return (
        <>
            {/* Header */}
            <div className="dash-header">
                <div>
                    <div className="dash-title">Overview</div>
                    {stats?.gymName && (
                        <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 4, letterSpacing: "0.05em" }}>
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
                    <div className="kpi-value">{stats?.memberCount ?? 0}</div>
                    <div className="kpi-delta">↑ this month</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Monthly Revenue</div>
                    <div className="kpi-value">{formatEuro(stats?.monthlyRevenue ?? 0)}</div>
                    <div className="kpi-delta">paid invoices</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Check-ins Today</div>
                    <div className="kpi-value">{stats?.checkinsToday ?? 0}</div>
                    <div className="kpi-delta">attended reservations</div>
                </div>
            </div>

            {/* Analytics widgets */}
            <div className="dash-grid2" style={{ marginBottom: 24 }}>

                {/* Popular classes */}
                <div>
                    <div className="section-head">
                        <span className="section-title">Most booked classes</span>
                        <span style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: "0.08em" }}>LAST 30 DAYS</span>
                    </div>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                        {popularClasses.length === 0 ? (
                            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted2)", fontSize: 13 }}>
                                No bookings yet.
                            </div>
                        ) : popularClasses.map((c, i) => (
                            <div key={c.id} style={{
                                padding: "14px 20px",
                                borderBottom: i < popularClasses.length - 1 ? "1px solid var(--border)" : "none",
                                display: "flex", flexDirection: "column", gap: 8,
                            }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                        <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text)", textTransform: "uppercase" }}>
                                            {c.title}
                                        </span>
                                        <span style={{ fontSize: 11, color: "var(--muted2)", marginLeft: 10 }}>
                                            {DAYS_SHORT[c.day_of_week]} · {c.time_of_day?.slice(0, 5)}
                                            {c.instructor ? ` · ${c.instructor}` : ""}
                                        </span>
                                    </div>
                                    <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--accent)" }}>
                                        {c.count}
                                    </span>
                                </div>
                                {/* Bar */}
                                <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                                    <div style={{
                                        height: "100%",
                                        width: `${(c.count / maxCount) * 100}%`,
                                        background: "var(--accent)",
                                        borderRadius: 2,
                                        opacity: 0.8,
                                        transition: "width .4s ease",
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Member activity */}
                <div>
                    <div className="section-head">
                        <span className="section-title">Member activity</span>
                        <span style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: "0.08em" }}>LAST 30 DAYS</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                        {/* Heavy users */}
                        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>🔥 Heavy bookers</span>
                                <span style={{ fontSize: 11, color: "var(--muted2)", marginLeft: "auto" }}>{heavyMembers.length} members</span>
                            </div>
                            {heavyMembers.length === 0 ? (
                                <div style={{ padding: "16px 20px", fontSize: 12, color: "var(--muted2)" }}>No data yet.</div>
                            ) : heavyMembers.slice(0, 4).map((m, i) => (
                                <div key={m.id} style={{
                                    padding: "10px 16px",
                                    borderBottom: i < Math.min(heavyMembers.length, 4) - 1 ? "1px solid var(--border)" : "none",
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                }}>
                                    <div>
                                        <div style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>{m.name}</div>
                                        <div style={{ fontSize: 11, color: "var(--muted2)" }}>{m.email}</div>
                                    </div>
                                    <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>
                                        {m.count}×
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Light users */}
                        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>🌙 Low activity</span>
                                <span style={{ fontSize: 11, color: "var(--muted2)", marginLeft: "auto" }}>{lightMembers.length} members</span>
                            </div>
                            {lightMembers.length === 0 ? (
                                <div style={{ padding: "16px 20px", fontSize: 12, color: "var(--muted2)" }}>No data yet.</div>
                            ) : lightMembers.slice(0, 4).map((m, i) => (
                                <div key={m.id} style={{
                                    padding: "10px 16px",
                                    borderBottom: i < Math.min(lightMembers.length, 4) - 1 ? "1px solid var(--border)" : "none",
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                }}>
                                    <div>
                                        <div style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>{m.name}</div>
                                        <div style={{ fontSize: 11, color: "var(--muted2)" }}>{m.email}</div>
                                    </div>
                                    <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--muted)" }}>
                                        {m.count}×
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent members + activity */}
            <div className="dash-grid2">
                <div>
                    <div className="section-head">
                        <span className="section-title">Recent Members</span>
                        <span className="section-link">View all →</span>
                    </div>
                    <div className="member-table">
                        <div className="mt-header">
                            <div className="mt-col">Name</div>
                            <div className="mt-col">Status</div>
                            <div className="mt-col">Joined</div>
                        </div>
                        {members.length === 0 ? (
                            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted2)", fontSize: 14 }}>
                                No members yet.
                            </div>
                        ) : members.slice(0, 5).map((m) => (
                            <div key={m.id} className="mt-row">
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
                        ))}
                    </div>
                </div>

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