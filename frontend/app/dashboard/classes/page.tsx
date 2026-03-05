"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface GymClass {
    id: string;
    title: string;
    schedule: string;
    capacity: number;
    description: string | null;
    duration_minutes: number | null;
    instructor: string | null;
}

const emptyForm = {
    title: "",
    schedule: "",
    capacity: "",
    description: "",
    duration_minutes: "",
    instructor: "",
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("nl-BE", {
        weekday: "short", day: "numeric", month: "short",
    });
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("nl-BE", {
        hour: "2-digit", minute: "2-digit",
    });
}

function isPast(iso: string) {
    return new Date(iso) < new Date();
}

export default function ClassesPage() {
    const [classes, setClasses]     = useState<GymClass[]>([]);
    const [loading, setLoading]     = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editClass, setEditClass] = useState<GymClass | null>(null);
    const [form, setForm]           = useState(emptyForm);
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);
    const [deleteId, setDeleteId]   = useState<string | null>(null);
    const [showPast, setShowPast]   = useState(false);

    useEffect(() => {
        api.get<GymClass[]>("/classes/all")
            .then((res) => setClasses(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const openCreate = () => {
        setEditClass(null);
        setForm(emptyForm);
        setFormError("");
        setShowModal(true);
    };

    const openEdit = (c: GymClass) => {
        setEditClass(c);
        // Convert ISO to local datetime-local format
        const local = new Date(c.schedule);
        const pad = (n: number) => String(n).padStart(2, "0");
        const localStr = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
        setForm({
            title: c.title,
            schedule: localStr,
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
        if (!form.schedule)        return setFormError("Date & time is required.");
        if (!form.capacity)        return setFormError("Capacity is required.");
        if (Number(form.capacity) < 1) return setFormError("Capacity must be at least 1.");

        setFormError("");
        setFormLoading(true);

        const payload = {
            title: form.title.trim(),
            schedule: new Date(form.schedule).toISOString(),
            capacity: Number(form.capacity),
            description: form.description.trim() || undefined,
            duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
            instructor: form.instructor.trim() || undefined,
        };

        try {
            if (editClass) {
                const { data } = await api.patch<GymClass>(`/classes/${editClass.id}`, payload);
                setClasses((prev) => prev.map((c) => c.id === data.id ? data : c)
                    .sort((a, b) => new Date(a.schedule).getTime() - new Date(b.schedule).getTime()));
            } else {
                const { data } = await api.post<GymClass>("/classes", payload);
                setClasses((prev) => [...prev, data]
                    .sort((a, b) => new Date(a.schedule).getTime() - new Date(b.schedule).getTime()));
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

    const upcoming = classes.filter((c) => !isPast(c.schedule));
    const past     = classes.filter((c) => isPast(c.schedule));
    const visible  = showPast ? classes : upcoming;

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
                        {upcoming.length} upcoming · {past.length} past
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={() => setShowPast(!showPast)}
                        style={{
                            padding: "10px 16px", borderRadius: 8,
                            background: "transparent",
                            border: "1px solid var(--border)",
                            color: "var(--muted2)", fontSize: 13,
                            cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                        }}
                    >
                        {showPast ? "Hide past" : "Show past"}
                    </button>
                    <button
                        className="btn-p"
                        style={{ width: "auto", padding: "10px 20px", fontSize: 14 }}
                        onClick={openCreate}
                    >
                        + New class
                    </button>
                </div>
            </div>

            {/* ── CLASSES LIST ── */}
            {visible.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: "80px 20px",
                    color: "var(--muted2)", fontSize: 14,
                }}>
                    {showPast ? "No classes yet." : "No upcoming classes. Create your first one."}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                    {visible.map((c) => {
                        const past = isPast(c.schedule);
                        return (
                            <div key={c.id} style={{
                                background: "var(--surface)",
                                border: `1px solid ${past ? "var(--border)" : "var(--border)"}`,
                                borderRadius: 14, padding: "20px 24px",
                                display: "flex", alignItems: "center", gap: 20,
                                opacity: past ? 0.6 : 1,
                                transition: "border-color .2s",
                            }}
                                 onMouseEnter={(e) => !past && (e.currentTarget.style.borderColor = "var(--accent-border)")}
                                 onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                            >
                                {/* Date block */}
                                <div style={{
                                    minWidth: 56, textAlign: "center",
                                    background: past ? "var(--surface2)" : "var(--accent-subtle)",
                                    border: `1px solid ${past ? "var(--border)" : "var(--accent-border)"}`,
                                    borderRadius: 10, padding: "8px 4px",
                                }}>
                                    <div style={{
                                        fontFamily: "Barlow Condensed, sans-serif",
                                        fontWeight: 700, fontSize: 22,
                                        color: past ? "var(--muted)" : "var(--accent)",
                                        lineHeight: 1,
                                    }}>
                                        {new Date(c.schedule).getDate()}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--muted2)", textTransform: "uppercase" }}>
                                        {new Date(c.schedule).toLocaleDateString("nl-BE", { month: "short" })}
                                    </div>
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontFamily: "Barlow Condensed, sans-serif",
                                        fontWeight: 700, fontSize: 18,
                                        color: "var(--text)", marginBottom: 2,
                                        textTransform: "uppercase",
                                    }}>
                                        {c.title}
                                    </div>
                                    <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                                        <span>🕐 {formatTime(c.schedule)}</span>
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

                                {/* Actions */}
                                {!past && (
                                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                        <button onClick={() => openEdit(c)} style={{
                                            padding: "8px 14px", borderRadius: 8,
                                            background: "transparent",
                                            border: "1px solid var(--border)",
                                            color: "var(--text-dim)", fontSize: 13,
                                            cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                                        }}>
                                            Edit
                                        </button>
                                        <button onClick={() => setDeleteId(c.id)} style={{
                                            padding: "8px 14px", borderRadius: 8,
                                            background: "transparent",
                                            border: "1px solid var(--border)",
                                            color: "var(--muted2)", fontSize: 13,
                                            cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                                        }}>
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── CREATE / EDIT MODAL ── */}
            {showModal && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 24,
                }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
                    <div style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 16, padding: 40, width: "100%", maxWidth: 480,
                        maxHeight: "90vh", overflowY: "auto",
                    }}>
                        <h2 className="fh" style={{ fontSize: 36, marginBottom: 6 }}>
                            {editClass ? "Edit" : "New"}<br />class
                        </h2>
                        <p className="fs">{editClass ? "Update this class." : "Schedule a new class for your members."}</p>

                        {formError && <div className="error-msg">{formError}</div>}

                        <div className="field">
                            <label>Class name</label>
                            <input placeholder="e.g. CrossFit, Yoga, Boxing" value={form.title}
                                   onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        </div>

                        <div className="field">
                            <label>Date & time</label>
                            <input type="datetime-local" value={form.schedule}
                                   onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
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
                                {formLoading ? "Saving..." : editClass ? "Save changes →" : "Schedule class →"}
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
                            This cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn-ghost" onClick={() => setDeleteId(null)}
                                    style={{ flex: 1, marginTop: 0 }}>Cancel</button>
                            <button onClick={() => handleDelete(deleteId)} style={{
                                flex: 1, padding: "14px 0", borderRadius: 10,
                                background: "var(--danger-subtle)",
                                border: "1px solid var(--danger-border)",
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