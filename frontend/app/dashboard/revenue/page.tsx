"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface RevenueData {
    kpis: {
        totalRevenue: number;
        thisMonthRevenue: number;
        lastMonthRevenue: number;
        totalPayments: number;
        thisMonthPayments: number;
    };
    monthlyData: { month: string; revenue: number; count: number }[];
    byPlan: { name: string; revenue: number; count: number }[];
    recentPayments: {
        id: string;
        amount: number;
        created_at: string;
        memberName: string;
        memberEmail: string;
        planName: string;
    }[];
}

function fmt(amount: number) {
    return `€${amount.toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
}

function MiniBarChart({ data }: { data: { month: string; revenue: number }[] }) {
    const max = Math.max(...data.map(d => d.revenue), 1);
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, marginTop: 8 }}>
            {data.map((d, i) => {
                const isLast = i === data.length - 1;
                const height = Math.max((d.revenue / max) * 80, d.revenue > 0 ? 4 : 1);
                return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{
                            width: "100%", height, borderRadius: "4px 4px 0 0",
                            background: isLast ? "var(--accent)" : "var(--accent-border)",
                            transition: "height .3s",
                        }} title={`${d.month}: ${fmt(d.revenue)}`} />
                        <div style={{ fontSize: 10, color: "var(--muted2)", whiteSpace: "nowrap" }}>{d.month}</div>
                    </div>
                );
            })}
        </div>
    );
}

export default function RevenuePage() {
    const [data, setData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get<RevenueData>("/payments/revenue")
            .then(res => setData(res.data))
            .catch(() => setError("Could not load revenue data."))
            .finally(() => setLoading(false));
    }, []);

    const momChange = data
        ? data.kpis.lastMonthRevenue > 0
            ? ((data.kpis.thisMonthRevenue - data.kpis.lastMonthRevenue) / data.kpis.lastMonthRevenue) * 100
            : null
        : null;

    if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;
    if (error) return <div className="error-msg">{error}</div>;
    if (!data) return null;

    return (
        <>
            <div className="dash-header">
                <div>
                    <div className="dash-title">Revenue</div>
                    <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 4 }}>Payment overview for your gym</div>
                </div>
            </div>

            {/* KPI CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
                {[
                    { label: "Total revenue", value: fmt(data.kpis.totalRevenue), sub: `${data.kpis.totalPayments} payments` },
                    {
                        label: "This month",
                        value: fmt(data.kpis.thisMonthRevenue),
                        sub: momChange !== null
                            ? `${momChange >= 0 ? "+" : ""}${momChange.toFixed(0)}% vs last month`
                            : `${data.kpis.thisMonthPayments} payments`,
                        accent: momChange !== null && momChange >= 0,
                        warn: momChange !== null && momChange < 0,
                    },
                    { label: "Last month", value: fmt(data.kpis.lastMonthRevenue), sub: "previous month" },
                ].map((kpi, i) => (
                    <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
                        {i === 0 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--accent), transparent)" }} />}
                        <div className="kpi-label">{kpi.label}</div>
                        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 900, fontSize: 32, color: "var(--text)", margin: "6px 0 4px" }}>{kpi.value}</div>
                        <div style={{ fontSize: 12, color: (kpi as any).accent ? "var(--accent)" : (kpi as any).warn ? "#FFB400" : "var(--muted2)" }}>{kpi.sub}</div>
                    </div>
                ))}
            </div>

            {/* CHART + BY PLAN — stacks on mobile */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 28 }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
                    <div className="kpi-label" style={{ marginBottom: 4 }}>Monthly revenue</div>
                    <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 8 }}>Last 6 months</div>
                    <MiniBarChart data={data.monthlyData} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                        {data.monthlyData.map((d, i) => (
                            <div key={i} style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, color: "var(--muted2)" }}>{d.month}</div>
                                <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{d.revenue > 0 ? fmt(d.revenue) : "—"}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
                    <div className="kpi-label" style={{ marginBottom: 16 }}>By plan</div>
                    {data.byPlan.length === 0 ? (
                        <div style={{ fontSize: 13, color: "var(--muted2)" }}>No data yet.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {data.byPlan.map((plan, i) => {
                                const pct = data.kpis.totalRevenue > 0 ? (plan.revenue / data.kpis.totalRevenue) * 100 : 0;
                                return (
                                    <div key={i}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{plan.name}</span>
                                            <span style={{ fontSize: 13, color: "var(--accent)", fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700 }}>{fmt(plan.revenue)}</span>
                                        </div>
                                        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 2, transition: "width .4s" }} />
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 2 }}>{plan.count} payment{plan.count !== 1 ? "s" : ""}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* RECENT PAYMENTS */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
                <div className="kpi-label" style={{ marginBottom: 16 }}>Recent payments</div>
                {data.recentPayments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted2)", fontSize: 14 }}>No payments yet.</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {["Member", "Plan", "Amount", "Date"].map(h => (
                                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted2)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {data.recentPayments.map((p, i) => (
                                <tr key={p.id} style={{ borderBottom: i < data.recentPayments.length - 1 ? "1px solid var(--border)" : "none" }}>
                                    <td style={{ padding: "12px 12px", minWidth: 140 }}>
                                        <div style={{ fontWeight: 500, color: "var(--text)" }}>{p.memberName}</div>
                                        <div style={{ fontSize: 11, color: "var(--muted2)" }}>{p.memberEmail}</div>
                                    </td>
                                    <td style={{ padding: "12px 12px", color: "var(--muted)", whiteSpace: "nowrap" }}>{p.planName}</td>
                                    <td style={{ padding: "12px 12px", fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--accent)", whiteSpace: "nowrap" }}>{fmt(p.amount)}</td>
                                    <td style={{ padding: "12px 12px", color: "var(--muted2)", whiteSpace: "nowrap" }}>{formatDate(p.created_at)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}