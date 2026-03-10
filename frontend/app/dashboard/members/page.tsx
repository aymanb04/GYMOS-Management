"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Plan {
    id: string;
    name: string;
    price: number;
    duration_months: number;
}

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    created_at: string;
    membership_expires_at: string | null;
    membership_plan: Plan | Plan[] | null;
}

function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("nl-BE", {
        day: "numeric", month: "short", year: "numeric",
    });
}

function getPlan(member: Member): Plan | null {
    if (!member.membership_plan) return null;
    if (Array.isArray(member.membership_plan)) return member.membership_plan[0] ?? null;
    return member.membership_plan;
}

function isExpired(expiresAt: string | null) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
}

export default function MembersPage() {
    const [members, setMembers]     = useState<Member[]>([]);
    const [plans, setPlans]         = useState<Plan[]>([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState("");
    const [showAdd, setShowAdd]     = useState(false);
    const [filter, setFilter]       = useState<"all" | "active" | "inactive">("all");

    // Cash payment modal
    const [cashMember, setCashMember]   = useState<Member | null>(null);
    const [cashPlanId, setCashPlanId]   = useState("");
    const [cashLoading, setCashLoading] = useState(false);
    const [cashError, setCashError]     = useState("");

    // Add member form
    const [form, setForm] = useState({
        name: "", email: "", password: "", membership_plan_id: "",
    });
    const [formError, setFormError]     = useState("");
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get<Member[]>("/members"),
            api.get<Plan[]>("/members/plans"),
        ])
            .then(([membersRes, plansRes]) => {
                setMembers(membersRes.data);
                setPlans(plansRes.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = members.filter((m) => {
        const matchSearch =
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.email.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === "all" ? true : filter === "active" ? m.active : !m.active;
        return matchSearch && matchFilter;
    });

    const handleAdd = async () => {
        if (!form.name || !form.email || !form.password) {
            setFormError("Name, email and password are required.");
            return;
        }
        setFormError("");
        setFormLoading(true);
        try {
            const { data } = await api.post<Member>("/members", {
                name: form.name,
                email: form.email,
                password: form.password,
                membership_plan_id: form.membership_plan_id || undefined,
            });
            setMembers((prev) => [data, ...prev]);
            setShowAdd(false);
            setForm({ name: "", email: "", password: "", membership_plan_id: "" });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? "Could not create member.";
            setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setFormLoading(false);
        }
    };

    const handleToggleStatus = async (member: Member) => {
        try {
            const { data } = await api.patch<{ id: string; active: boolean }>(
                `/members/${member.id}/status`
            );
            setMembers((prev) =>
                prev.map((m) => (m.id === data.id ? { ...m, active: data.active } : m))
            );
        } catch { console.error("Could not toggle status"); }
    };

    const handleAssignPlan = async (member: Member, planId: string) => {
        try {
            await api.patch(`/members/${member.id}/plan`, { planId: planId || null });
            setMembers((prev) =>
                prev.map((m) => {
                    if (m.id !== member.id) return m;
                    const plan = plans.find((p) => p.id === planId) ?? null;
                    return { ...m, membership_plan: plan };
                })
            );
        } catch { console.error("Could not assign plan"); }
    };

    const openCashModal = (member: Member) => {
        const currentPlan = getPlan(member);
        setCashMember(member);
        setCashPlanId(currentPlan?.id ?? plans[0]?.id ?? "");
        setCashError("");
    };

    const handleCashPayment = async () => {
        if (!cashMember || !cashPlanId) return setCashError("Select a plan.");
        setCashLoading(true);
        setCashError("");
        try {
            const { data } = await api.post<{ expires_at: string; plan_name: string }>(
                `/members/${cashMember.id}/cash-payment`,
                { planId: cashPlanId }
            );
            const plan = plans.find((p) => p.id === cashPlanId) ?? null;
            setMembers((prev) =>
                prev.map((m) =>
                    m.id === cashMember.id
                        ? { ...m, membership_plan: plan, membership_expires_at: data.expires_at, active: true }
                        : m
                )
            );
            setCashMember(null);
        } catch {
            setCashError("Could not record payment.");
        } finally {
            setCashLoading(false);
        }
    };

    const activeCount   = members.filter((m) => m.active).length;
    const inactiveCount = members.filter((m) => !m.active).length;
    const expiringCount = members.filter(
        (m) => m.active && m.membership_expires_at &&
            new Date(m.membership_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length;

    const selectedCashPlan = plans.find((p) => p.id === cashPlanId);

    if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

    return (
        <>
            {/* HEADER */}
            <div className="dash-header">
                <div>
                    <div className="dash-title">Members</div>
                    <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 4 }}>
                        {members.length} total · {activeCount} active · {inactiveCount} inactive
                        {expiringCount > 0 && (
                            <span style={{ color: "var(--danger)", marginLeft: 8 }}>
                                · {expiringCount} expiring soon
                            </span>
                        )}
                    </div>
                </div>
                <button className="btn-p" style={{ width: "auto", padding: "10px 20px", fontSize: 14 }}
                        onClick={() => setShowAdd(true)}>
                    + Add member
                </button>
            </div>

            {/* FILTERS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                <input
                    placeholder="Search name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: "100%",
                        background: "var(--input-bg)", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "10px 14px", fontSize: 14,
                        color: "var(--text)", outline: "none", fontFamily: "DM Sans, sans-serif",
                    }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                    {(["all", "active", "inactive"] as const).map((f) => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            padding: "8px 16px", borderRadius: 8, fontSize: 12,
                            letterSpacing: "0.08em", textTransform: "uppercase",
                            cursor: "pointer", transition: "all .2s", fontFamily: "DM Sans, sans-serif",
                            background: filter === f ? "var(--accent-subtle)" : "transparent",
                            border: `1px solid ${filter === f ? "var(--accent-border)" : "var(--border)"}`,
                            color: filter === f ? "var(--accent)" : "var(--muted2)",
                        }}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* TABLE */}
            <div className="member-table">
                {/* Desktop header — hidden on mobile via CSS */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 200px 44px 160px 140px 100px",
                    gap: 12, padding: "12px 20px",
                    borderBottom: "1px solid var(--border)",
                }} className="members-desktop-header">
                    {["Member", "Plan", "", "Expires", "Joined", "Status"].map((col, i) => (
                        <div key={i} className="mt-col">{col}</div>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted2)", fontSize: 14 }}>
                        {search ? "No members match your search." : "No members yet."}
                    </div>
                ) : (
                    filtered.map((member) => {
                        const plan = getPlan(member);
                        const expired = isExpired(member.membership_expires_at);

                        return (
                            <div key={member.id}
                                 className="member-row"
                                 onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card-hover)")}
                                 onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                {/* Desktop layout */}
                                <div className="member-row-desktop" style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 200px 44px 160px 140px 100px",
                                    gap: 12, padding: "14px 20px",
                                    alignItems: "center",
                                }}>
                                    <div>
                                        <div className="mt-name">{member.name}</div>
                                        <div className="mt-email">{member.email}</div>
                                    </div>
                                    <select
                                        value={plan?.id ?? ""}
                                        onChange={(e) => handleAssignPlan(member, e.target.value)}
                                        style={{
                                            background: "var(--input-bg)", border: "1px solid var(--border)",
                                            borderRadius: 6, padding: "6px 10px",
                                            fontSize: 12, color: plan ? "var(--text-dim)" : "var(--muted2)",
                                            cursor: "pointer", outline: "none",
                                            fontFamily: "DM Sans, sans-serif", width: "100%",
                                        }}
                                    >
                                        <option value="">No plan</option>
                                        {plans.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name} — €{p.price}/mo</option>
                                        ))}
                                    </select>
                                    <button onClick={() => openCashModal(member)} title="Record cash payment" style={{
                                        background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
                                        borderRadius: 6, padding: "6px 8px", fontSize: 14, cursor: "pointer", lineHeight: 1,
                                    }}>💵</button>
                                    <div style={{ fontSize: 12, color: expired ? "var(--danger)" : "var(--muted2)" }}>
                                        {formatDate(member.membership_expires_at)}
                                        {expired && (
                                            <span style={{ marginLeft: 6, fontSize: 10, background: "var(--danger-subtle)", color: "var(--danger)", border: "1px solid var(--danger-border)", borderRadius: 4, padding: "1px 5px" }}>expired</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--muted2)" }}>{formatDate(member.created_at)}</div>
                                    <button
                                        onClick={() => handleToggleStatus(member)}
                                        className={`badge ${member.active ? "active" : "inactive"}`}
                                        style={{ cursor: "pointer", border: "none", textAlign: "center" }}
                                        title={member.active ? "Click to deactivate" : "Click to activate"}
                                    >
                                        {member.active ? "active" : "inactive"}
                                    </button>
                                </div>

                                {/* Mobile layout */}
                                <div className="member-row-mobile" style={{ padding: "14px 16px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                        <div>
                                            <div className="mt-name">{member.name}</div>
                                            <div className="mt-email">{member.email}</div>
                                        </div>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <button
                                                onClick={() => handleToggleStatus(member)}
                                                className={`badge ${member.active ? "active" : "inactive"}`}
                                                style={{ cursor: "pointer", border: "none" }}
                                            >
                                                {member.active ? "active" : "inactive"}
                                            </button>
                                            <button onClick={() => openCashModal(member)} title="Record cash payment" style={{
                                                background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
                                                borderRadius: 6, padding: "4px 8px", fontSize: 14, cursor: "pointer", lineHeight: 1,
                                            }}>💵</button>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <select
                                            value={plan?.id ?? ""}
                                            onChange={(e) => handleAssignPlan(member, e.target.value)}
                                            style={{
                                                flex: 1, minWidth: 120,
                                                background: "var(--input-bg)", border: "1px solid var(--border)",
                                                borderRadius: 6, padding: "6px 10px",
                                                fontSize: 12, color: plan ? "var(--text-dim)" : "var(--muted2)",
                                                cursor: "pointer", outline: "none", fontFamily: "DM Sans, sans-serif",
                                            }}
                                        >
                                            <option value="">No plan</option>
                                            {plans.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name} — €{p.price}/mo</option>
                                            ))}
                                        </select>
                                        <div style={{ fontSize: 12, color: expired ? "var(--danger)" : "var(--muted2)", whiteSpace: "nowrap" }}>
                                            {expired ? "⚠ " : "⏱ "}{formatDate(member.membership_expires_at)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* CASH PAYMENT MODAL */}
            {cashMember && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
                }}
                     onClick={(e) => e.target === e.currentTarget && setCashMember(null)}
                >
                    <div className="fade-in" style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>💵</div>
                        <h2 className="fh" style={{ fontSize: 28, marginBottom: 4 }}>Cash payment</h2>
                        <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 24 }}>
                            Record a cash payment for <strong style={{ color: "var(--text)" }}>{cashMember.name}</strong>.
                            This will activate their membership.
                        </p>

                        {cashError && <div className="error-msg">{cashError}</div>}

                        <div className="field">
                            <label>Membership plan</label>
                            <select
                                value={cashPlanId}
                                onChange={(e) => setCashPlanId(e.target.value)}
                                style={{
                                    width: "100%", background: "var(--input-bg)",
                                    border: "1px solid var(--border)", borderRadius: 10,
                                    padding: "14px 16px", fontSize: 14,
                                    color: "var(--text)", outline: "none",
                                    fontFamily: "DM Sans, sans-serif",
                                }}
                            >
                                <option value="">Select a plan...</option>
                                {plans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} — €{p.price} / {p.duration_months} month{p.duration_months !== 1 ? "s" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedCashPlan && (
                            <div style={{
                                background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
                                borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13,
                                color: "var(--accent)",
                            }}>
                                ✓ €{selectedCashPlan.price} — membership active for {selectedCashPlan.duration_months} month{selectedCashPlan.duration_months !== 1 ? "s" : ""}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn-p" onClick={handleCashPayment} disabled={cashLoading || !cashPlanId} style={{ flex: 1 }}>
                                {cashLoading ? "Recording..." : "Record payment →"}
                            </button>
                            <button className="btn-ghost" onClick={() => setCashMember(null)}
                                    style={{ width: "auto", padding: "14px 20px", marginTop: 0 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD MEMBER MODAL */}
            {showAdd && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
                }}
                     onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}
                >
                    <div className="fade-in" style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 16, padding: 40, width: "100%", maxWidth: 440,
                    }}>
                        <h2 className="fh" style={{ fontSize: 36, marginBottom: 6 }}>Add<br />member</h2>
                        <p className="fs">Create a member account manually.</p>

                        {formError && <div className="error-msg">{formError}</div>}

                        <div className="field">
                            <label>Full name</label>
                            <input placeholder="Alex Martens" value={form.name}
                                   onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>Email</label>
                            <input type="email" placeholder="alex@example.com" value={form.email}
                                   onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>Temporary password</label>
                            <input type="password" placeholder="Min. 6 characters" value={form.password}
                                   onChange={(e) => setForm({ ...form, password: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>Membership plan (optional)</label>
                            <select value={form.membership_plan_id}
                                    onChange={(e) => setForm({ ...form, membership_plan_id: e.target.value })}
                                    style={{
                                        width: "100%", background: "var(--input-bg)",
                                        border: "1px solid var(--border)", borderRadius: 10,
                                        padding: "14px 16px", fontSize: 14,
                                        color: "var(--text)", outline: "none", fontFamily: "DM Sans, sans-serif",
                                    }}
                            >
                                <option value="">No plan yet</option>
                                {plans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} — €{p.price} / {p.duration_months} months
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            <button className="btn-p" onClick={handleAdd} disabled={formLoading} style={{ flex: 1 }}>
                                {formLoading ? "Creating..." : "Create member →"}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowAdd(false)}
                                    style={{ width: "auto", padding: "14px 20px", marginTop: 0 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}