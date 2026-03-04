"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Plan {
    id: string;
    name: string;
    price: number;
    duration_months: number;
    description: string | null;
    created_at: string;
}

const emptyForm = { name: "", price: "", duration_months: "", description: "" };

export default function PlansPage() {
    const [plans, setPlans]       = useState<Plan[]>([]);
    const [loading, setLoading]   = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editPlan, setEditPlan] = useState<Plan | null>(null);
    const [form, setForm]         = useState(emptyForm);
    const [formError, setFormError]     = useState("");
    const [formLoading, setFormLoading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        api.get<Plan[]>("/plans")
            .then((res) => setPlans(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const openCreate = () => {
        setEditPlan(null);
        setForm(emptyForm);
        setFormError("");
        setShowModal(true);
    };

    const openEdit = (plan: Plan) => {
        setEditPlan(plan);
        setForm({
            name: plan.name,
            price: String(plan.price),
            duration_months: String(plan.duration_months),
            description: plan.description ?? "",
        });
        setFormError("");
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim())         return setFormError("Name is required.");
        if (!form.price)               return setFormError("Price is required.");
        if (!form.duration_months)     return setFormError("Duration is required.");
        if (Number(form.price) < 0)    return setFormError("Price can't be negative.");
        if (Number(form.duration_months) < 1) return setFormError("Duration must be at least 1 month.");

        setFormError("");
        setFormLoading(true);

        const payload = {
            name: form.name.trim(),
            price: Number(form.price),
            duration_months: Number(form.duration_months),
            description: form.description.trim() || undefined,
        };

        try {
            if (editPlan) {
                const { data } = await api.patch<Plan>(`/plans/${editPlan.id}`, payload);
                setPlans((prev) => prev.map((p) => p.id === data.id ? data : p));
            } else {
                const { data } = await api.post<Plan>("/plans", payload);
                setPlans((prev) => [...prev, data].sort((a, b) => a.price - b.price));
            }
            setShowModal(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? "Could not save plan.";
            setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (planId: string) => {
        try {
            await api.delete(`/plans/${planId}`);
            setPlans((prev) => prev.filter((p) => p.id !== planId));
        } catch {
            console.error("Could not delete plan");
        } finally {
            setDeleteId(null);
        }
    };

    if (loading) {
        return <div className="spinner-wrap"><div className="spinner" /></div>;
    }

    return (
        <>
            {/* ── HEADER ── */}
            <div className="dash-header">
                <div>
                    <div className="dash-title">Membership Plans</div>
                    <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 4 }}>
                        {plans.length} plan{plans.length !== 1 ? "s" : ""} configured
                    </div>
                </div>
                <button
                    className="btn-p"
                    style={{ width: "auto", padding: "10px 20px", fontSize: 14 }}
                    onClick={openCreate}
                >
                    + New plan
                </button>
            </div>

            {/* ── PLANS GRID ── */}
            {plans.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: "80px 20px",
                    color: "var(--muted2)", fontSize: 14,
                }}>
                    No plans yet. Create your first membership plan.
                </div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16, marginTop: 8,
                }}>
                    {plans.map((plan) => (
                        <div key={plan.id} style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 16, padding: 28,
                            position: "relative", overflow: "hidden",
                            transition: "border-color .2s",
                        }}
                             onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-border)")}
                             onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                            {/* accent top bar */}
                            <div style={{
                                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                                background: "linear-gradient(90deg, var(--accent), transparent)",
                            }} />

                            <div style={{
                                fontFamily: "Barlow Condensed, sans-serif",
                                fontWeight: 900, fontSize: 22,
                                color: "var(--text)", marginBottom: 4,
                                textTransform: "uppercase", letterSpacing: "0.03em",
                            }}>
                                {plan.name}
                            </div>

                            {plan.description && (
                                <div style={{
                                    fontSize: 13, color: "var(--muted)",
                                    marginBottom: 20, lineHeight: 1.5,
                                }}>
                                    {plan.description}
                                </div>
                            )}

                            <div style={{
                                display: "flex", alignItems: "baseline", gap: 4,
                                marginBottom: 6,
                            }}>
                                <span style={{
                                    fontFamily: "Barlow Condensed, sans-serif",
                                    fontWeight: 700, fontSize: 40,
                                    color: "var(--accent)",
                                }}>
                                    €{plan.price}
                                </span>
                                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                                    / {plan.duration_months === 1 ? "month" : `${plan.duration_months} months`}
                                </span>
                            </div>

                            <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 24 }}>
                                {plan.duration_months === 1
                                    ? "Monthly subscription"
                                    : plan.duration_months === 12
                                        ? "Annual subscription"
                                        : `${plan.duration_months}-month subscription`}
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={() => openEdit(plan)}
                                    style={{
                                        flex: 1, padding: "8px 0", borderRadius: 8,
                                        background: "transparent",
                                        border: "1px solid var(--border)",
                                        color: "var(--text-dim)", fontSize: 13,
                                        cursor: "pointer", transition: "all .2s",
                                        fontFamily: "DM Sans, sans-serif",
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-border)";
                                        (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                                        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)";
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setDeleteId(plan.id)}
                                    style={{
                                        padding: "8px 16px", borderRadius: 8,
                                        background: "transparent",
                                        border: "1px solid var(--border)",
                                        color: "var(--muted2)", fontSize: 13,
                                        cursor: "pointer", transition: "all .2s",
                                        fontFamily: "DM Sans, sans-serif",
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--danger-border)";
                                        (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)";
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                                        (e.currentTarget as HTMLButtonElement).style.color = "var(--muted2)";
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── CREATE / EDIT MODAL ── */}
            {showModal && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 24,
                }}
                     onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
                >
                    <div style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 16, padding: 40, width: "100%", maxWidth: 440,
                    }}>
                        <h2 className="fh" style={{ fontSize: 36, marginBottom: 6 }}>
                            {editPlan ? "Edit" : "New"}<br />plan
                        </h2>
                        <p className="fs">
                            {editPlan ? "Update this membership plan." : "Create a new membership plan for your gym."}
                        </p>

                        {formError && <div className="error-msg">{formError}</div>}

                        <div className="field">
                            <label>Plan name</label>
                            <input
                                placeholder="e.g. Monthly, Premium, Student"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div className="field">
                                <label>Price (€)</label>
                                <input
                                    type="number"
                                    placeholder="49"
                                    min="0"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label>Duration (months)</label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    min="1"
                                    value={form.duration_months}
                                    onChange={(e) => setForm({ ...form, duration_months: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label>Description <span style={{ color: "var(--muted2)", fontWeight: 300 }}>(optional)</span></label>
                            <input
                                placeholder="e.g. Unlimited access, all classes included"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            <button className="btn-p" onClick={handleSave} disabled={formLoading} style={{ flex: 1 }}>
                                {formLoading ? "Saving..." : editPlan ? "Save changes →" : "Create plan →"}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowModal(false)}
                                    style={{ width: "auto", padding: "14px 20px", marginTop: 0 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRM MODAL ── */}
            {deleteId && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 24,
                }}
                     onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}
                >
                    <div style={{
                        background: "var(--surface)", border: "1px solid var(--danger-border)",
                        borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
                        textAlign: "center",
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
                        <h2 style={{
                            fontFamily: "Barlow Condensed, sans-serif",
                            fontWeight: 700, fontSize: 24,
                            color: "var(--text)", marginBottom: 8,
                        }}>
                            Delete this plan?
                        </h2>
                        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 32 }}>
                            Members assigned to this plan will lose their plan assignment. This cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn-ghost" onClick={() => setDeleteId(null)}
                                    style={{ flex: 1, marginTop: 0 }}>
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteId)}
                                style={{
                                    flex: 1, padding: "14px 0", borderRadius: 10,
                                    background: "var(--danger-subtle)",
                                    border: "1px solid var(--danger-border)",
                                    color: "var(--danger)", fontSize: 15,
                                    cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                                    fontWeight: 500,
                                }}
                            >
                                Delete →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}