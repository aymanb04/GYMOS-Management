"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface GymClass {
    id: string;
    title: string;
    day_of_week: number;
    time_of_day: string;
    capacity: number;
    description: string | null;
    duration_minutes: number | null;
    instructor: string | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const emptyForm = {
    title: "",
    day_of_week: "0",
    time_of_day: "09:00",
    capacity: "",
    description: "",
    duration_minutes: "",
    instructor: "",
};

export default function ClassesPage() {
    const [classes, setClasses]         = useState<GymClass[]>([]);
    const [loading, setLoading]         = useState(true);
    const [showModal, setShowModal]     = useState(false);
    const [editClass, setEditClass]     = useState<GymClass | null>(null);
    const [form, setForm]               = useState(emptyForm);
    const [formError, setFormError]     = useState("");
    const [formLoading, setFormLoading] = useState(false);
    const [deleteId, setDeleteId]       = useState<string | null>(null);
    const [activeDay, setActiveDay]     = useState<number | null>(null);

    useEffect(() => {
        api.get<GymClass[]>("/classes")
            .then((res) => setClasses(Array.isArray(res.data) ? res.data : []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const openCreate = (day?: number) => {
        setEditClass(null);
        setForm({ ...emptyForm, day_of_week: String(day ?? 0) });
        setFormError("");
        setShowModal(true);
    };

    const openEdit = (c: GymClass) => {
        setEditClass(c);
        setForm({
            title: c.title,
            day_of_week: String(c.day_of_week),
            time_of_day: c.time_of_day.slice(0, 5),
            capacity: String(c.capacity),
            description: c.description ?? "",
            duration_minutes: c.duration_minutes ? String(c.duration_minutes) : "",
            instructor: c.instructor ?? "",
        });
        setFormError("");
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.title.trim())    return setFormError("Title is required.");
        if (!form.time_of_day)     return setFormError("Time is required.");
        if (!form.capacity)        return setFormError("Capacity is required.");
        if (Number(form.capacity) < 1) return setFormError("Capacity must be at least 1.");

        setFormError("");
        setFormLoading(true);

        const payload = {
            title: form.title.trim(),
            day_of_week: Number(form.day_of_week),
            time_of_day: form.time_of_day,
            capacity: Number(form.capacity),
            description: form.description.trim() || undefined,
            duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
            instructor: form.instructor.trim() || undefined,
        };

        try {
            if (editClass) {
                const { data } = await api.patch<GymClass>(`/classes/${editClass.id}`, payload);
                setClasses((prev) => prev.map((c) => c.id === data.id ? data : c));
            } else {
                const { data } = await api.post<GymClass>("/classes", payload);
                setClasses((prev) => [...prev, data]);
            }
            setShowModal(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? "Could not save class.";
            setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/classes/${id}`);
            setClasses((prev) => prev.filter((c) => c.id !== id));
        } catch {
            console.error("Could not delete class");
        } finally {
            setDeleteId(null);
        }
    };

    const classesByDay = DAYS.map((_, i) =>
        classes.filter((c) => c.day_of_week === i)
            .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day))
    );

    if (loading) {
        return <div className="spinner-wrap"><div className="spinner" /></div>;
    }

    return (
        <>
            {/* ── HEADER ── */}
            <div className="dash-header">
                <div>
                    <div className="dash-title">Classes</div>
                    <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 4 }}>
                        {classes.length} class{classes.length !== 1 ? "es" : ""} in weekly schedule
                    </div>
                </div>
                <button
                    className="btn-p"
                    style={{ width: "auto", padding: "10px 20px", fontSize: 14 }}
                    onClick={() => openCreate()}
                >
                    + New class
                </button>
            </div>

            {/* ── DAY TABS ── */}
            <div style={{
                display: "flex", gap: 4, marginBottom: 24,
                overflowX: "auto", paddingBottom: 4,
            }}>
                <button
                    onClick={() => setActiveDay(null)}
                    style={{
                        padding: "8px 16px", borderRadius: 8, whiteSpace: "nowrap",
                        background: activeDay === null ? "var(--accent)" : "var(--surface)",
                        border: `1px solid ${activeDay === null ? "var(--accent)" : "var(--border)"}`,
                        color: activeDay === null ? "var(--bg)" : "var(--muted)",
                        fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                    }}
                >
                    All days
                </button>
                {DAYS_SHORT.map((day, i) => (
                    <button key={i} onClick={() => setActiveDay(i)} style={{
                        padding: "8px 16px", borderRadius: 8, whiteSpace: "nowrap",
                        background: activeDay === i ? "var(--accent)" : "var(--surface)",
                        border: `1px solid ${activeDay === i ? "var(--accent)" : "var(--border)"}`,
                        color: activeDay === i ? "var(--bg)" : "var(--muted)",
                        fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                        position: "relative",
                    }}>
                        {day}
                        {classesByDay[i].length > 0 && (
                            <span style={{
                                marginLeft: 6, background: activeDay === i ? "rgba(0,0,0,0.2)" : "var(--accent)",
                                color: activeDay === i ? "white" : "var(--bg)",
                                borderRadius: 10, padding: "1px 6px", fontSize: 11, fontWeight: 700,
                            }}>
                                {classesByDay[i].length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── WEEKLY GRID ── */}
            {activeDay === null ? (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                }}>
                    {DAYS.map((day, i) => (
                        <div key={i} style={{
                            background: "var(--surface)", border: "1px solid var(--border)",
                            borderRadius: 14, overflow: "hidden",
                        }}>
                            <div style={{
                                padding: "14px 20px",
                                borderBottom: "1px solid var(--border)",
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                            }}>
                                <span style={{
                                    fontFamily: "Barlow Condensed, sans-serif",
                                    fontWeight: 700, fontSize: 16,
                                    color: "var(--text)", textTransform: "uppercase",
                                }}>
                                    {day}
                                </span>
                                <button onClick={() => openCreate(i)} style={{
                                    background: "none", border: "none",
                                    color: "var(--accent)", fontSize: 18,
                                    cursor: "pointer", lineHeight: 1, padding: 0,
                                }}>+</button>
                            </div>

                            {classesByDay[i].length === 0 ? (
                                <div style={{
                                    padding: "20px", fontSize: 12,
                                    color: "var(--muted2)", textAlign: "center",
                                }}>
                                    No classes
                                </div>
                            ) : (
                                classesByDay[i].map((c) => (
                                    <div key={c.id} style={{
                                        padding: "12px 20px",
                                        borderBottom: "1px solid var(--border)",
                                        display: "flex", alignItems: "center", gap: 12,
                                    }}>
                                        <div style={{
                                            fontSize: 12, fontWeight: 600,
                                            color: "var(--accent)", minWidth: 40,
                                            fontFamily: "DM Sans, sans-serif",
                                        }}>
                                            {c.time_of_day.slice(0, 5)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 13, fontWeight: 600,
                                                color: "var(--text)", fontFamily: "DM Sans, sans-serif",
                                            }}>
                                                {c.title}
                                            </div>
                                            {c.instructor && (
                                                <div style={{ fontSize: 11, color: "var(--muted2)" }}>
                                                    {c.instructor}
                                                    {c.duration_minutes ? ` · ${c.duration_minutes}min` : ""}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", gap: 4 }}>
                                            <button onClick={() => openEdit(c)} style={{
                                                background: "none", border: "none",
                                                color: "var(--muted2)", fontSize: 12,
                                                cursor: "pointer", padding: "2px 6px",
                                                fontFamily: "DM Sans, sans-serif",
                                            }}>Edit</button>
                                            <button onClick={() => setDeleteId(c.id)} style={{
                                                background: "none", border: "none",
                                                color: "var(--muted2)", fontSize: 12,
                                                cursor: "pointer", padding: "2px 6px",
                                                fontFamily: "DM Sans, sans-serif",
                                            }}>✕</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                /* ── SINGLE DAY VIEW ── */
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {classesByDay[activeDay].length === 0 ? (
                        <div style={{
                            textAlign: "center", padding: "60px 20px",
                            color: "var(--muted2)", fontSize: 14,
                            background: "var(--surface)", borderRadius: 14,
                            border: "1px solid var(--border)",
                        }}>
                            No classes on {DAYS[activeDay]}.{" "}
                            <button onClick={() => openCreate(activeDay)} style={{
                                background: "none", border: "none",
                                color: "var(--accent)", cursor: "pointer",
                                fontFamily: "DM Sans, sans-serif", fontSize: 14,
                            }}>Add one →</button>
                        </div>
                    ) : (
                        classesByDay[activeDay].map((c) => (
                            <div key={c.id} style={{
                                background: "var(--surface)", border: "1px solid var(--border)",
                                borderRadius: 14, padding: "20px 24px",
                                display: "flex", alignItems: "center", gap: 16,
                            }}>
                                <div style={{
                                    fontFamily: "Barlow Condensed, sans-serif",
                                    fontWeight: 700, fontSize: 22,
                                    color: "var(--accent)", minWidth: 56,
                                }}>
                                    {c.time_of_day.slice(0, 5)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontFamily: "Barlow Condensed, sans-serif",
                                        fontWeight: 700, fontSize: 18,
                                        color: "var(--text)", textTransform: "uppercase",
                                    }}>
                                        {c.title}
                                    </div>
                                    <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", gap: 12 }}>
                                        {c.duration_minutes && <span>⏱ {c.duration_minutes} min</span>}
                                        {c.instructor && <span>👤 {c.instructor}</span>}
                                        <span>👥 {c.capacity} spots</span>
                                    </div>
                                    {c.description && (
                                        <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 4 }}>
                                            {c.description}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={() => openEdit(c)} style={{
                                        padding: "8px 14px", borderRadius: 8,
                                        background: "transparent", border: "1px solid var(--border)",
                                        color: "var(--text-dim)", fontSize: 13,
                                        cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                                    }}>Edit</button>
                                    <button onClick={() => setDeleteId(c.id)} style={{
                                        padding: "8px 14px", borderRadius: 8,
                                        background: "transparent", border: "1px solid var(--border)",
                                        color: "var(--muted2)", fontSize: 13,
                                        cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                                    }}>Delete</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── CREATE / EDIT MODAL ── */}
            {showModal && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
                }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
                    <div style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 16, padding: 40, width: "100%", maxWidth: 480,
                        maxHeight: "90vh", overflowY: "auto",
                    }}>
                        <h2 className="fh" style={{ fontSize: 36, marginBottom: 6 }}>
                            {editClass ? "Edit" : "New"}<br />class
                        </h2>
                        <p className="fs">{editClass ? "Update this class." : "Add a recurring class to the weekly schedule."}</p>

                        {formError && <div className="error-msg">{formError}</div>}

                        <div className="field">
                            <label>Class name</label>
                            <input placeholder="e.g. CrossFit, Yoga, Boxing" value={form.title}
                                   onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div className="field">
                                <label>Day</label>
                                <select value={form.day_of_week}
                                        onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                                        style={{
                                            width: "100%", padding: "12px 14px", borderRadius: 10,
                                            background: "var(--surface2)", border: "1px solid var(--border)",
                                            color: "var(--text)", fontSize: 14,
                                            fontFamily: "DM Sans, sans-serif",
                                        }}>
                                    {DAYS.map((d, i) => (
                                        <option key={i} value={i}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>Time</label>
                                <input type="time" value={form.time_of_day}
                                       onChange={(e) => setForm({ ...form, time_of_day: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div className="field">
                                <label>Capacity</label>
                                <input type="number" placeholder="20" min="1" value={form.capacity}
                                       onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Duration (min)</label>
                                <input type="number" placeholder="60" min="1" value={form.duration_minutes}
                                       onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
                            </div>
                        </div>

                        <div className="field">
                            <label>Instructor <span style={{ color: "var(--muted2)", fontWeight: 300 }}>(optional)</span></label>
                            <input placeholder="e.g. Coach Mike" value={form.instructor}
                                   onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
                        </div>

                        <div className="field">
                            <label>Description <span style={{ color: "var(--muted2)", fontWeight: 300 }}>(optional)</span></label>
                            <input placeholder="e.g. High intensity full body workout" value={form.description}
                                   onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            <button className="btn-p" onClick={handleSave} disabled={formLoading} style={{ flex: 1 }}>
                                {formLoading ? "Saving..." : editClass ? "Save changes →" : "Add to schedule →"}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowModal(false)}
                                    style={{ width: "auto", padding: "14px 20px", marginTop: 0 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRM ── */}
            {deleteId && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
                }} onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}>
                    <div style={{
                        background: "var(--surface)", border: "1px solid var(--danger-border)",
                        borderRadius: 16, padding: 40, width: "100%", maxWidth: 400, textAlign: "center",
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
                        <h2 style={{
                            fontFamily: "Barlow Condensed, sans-serif",
                            fontWeight: 700, fontSize: 24, color: "var(--text)", marginBottom: 8,
                        }}>Delete this class?</h2>
                        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 32 }}>
                            This will remove it from the weekly schedule permanently.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn-ghost" onClick={() => setDeleteId(null)}
                                    style={{ flex: 1, marginTop: 0 }}>Cancel</button>
                            <button onClick={() => handleDelete(deleteId)} style={{
                                flex: 1, padding: "14px 0", borderRadius: 10,
                                background: "var(--danger-subtle)", border: "1px solid var(--danger-border)",
                                color: "var(--danger)", fontSize: 15,
                                cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: 500,
                            }}>Delete →</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}