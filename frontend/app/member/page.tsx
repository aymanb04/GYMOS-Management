"use client";

import { useEffect, useState, useCallback } from "react";
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
    day_of_week: number;
    time_of_day: string;
    capacity: number;
    capacity_enforced: boolean;
    description: string | null;
    duration_minutes: number | null;
    instructor: string | null;
}

interface Plan {
    id: string;
    name: string;
    price: number;
    duration_months: number;
    description: string | null;
}

interface ClassDateData {
    counts: Record<string, number>;
    myBookings: Record<string, string>; // lessonId -> reservationId
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
}

function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// Get the next occurrence of a given day_of_week (0=Mon ... 6=Sun) from today
function getNextDateForDay(dayIndex: number): string {
    const today = new Date();
    const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const diff = (dayIndex - todayIndex + 7) % 7;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    return target.toISOString().split("T")[0];
}

type Tab = "membership" | "classes";

export default function MemberPage() {
    const { user, logout } = useAuth();
    const { gym } = useGym();

    const [profile, setProfile]       = useState<MemberProfile | null>(null);
    const [classes, setClasses]       = useState<GymClass[]>([]);
    const [plans, setPlans]           = useState<Plan[]>([]);
    const [loading, setLoading]       = useState(true);
    const [tab, setTab]               = useState<Tab>("membership");
    const [activeDay, setActiveDay]   = useState<number>(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
    const [payLoading, setPayLoading] = useState<string | null>(null);
    const [showPlans, setShowPlans]   = useState(false);

    const [classDateCache, setClassDateCache] = useState<Record<string, ClassDateData>>({});
    const [classDateData, setClassDateData]   = useState<ClassDateData>({ counts: {}, myBookings: {} });
    const [bookingLoading, setBookingLoading] = useState<string | null>(null);
    const [bookingError, setBookingError]     = useState<string | null>(null);

    const stripeEnabled = !!gym?.features?.stripe_payments;

    useEffect(() => {
        Promise.all([
            api.get<MemberProfile>("/members/me"),
            api.get<GymClass[]>("/classes"),
            api.get<Plan[]>("/plans"),
        ])
            .then(([profileRes, classesRes, plansRes]) => {
                setProfile(profileRes.data);
                setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
                setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const fetchClassDataForDay = useCallback(async (dayIndex: number, forceRefresh = false) => {
        const date = getNextDateForDay(dayIndex);

        if (!forceRefresh && classDateCache[date]) {
            setClassDateData(classDateCache[date]);
            return;
        }

        try {
            const res = await api.get<ClassDateData>(`/reservations/date/${date}`);
            setClassDateCache((prev) => ({ ...prev, [date]: res.data }));
            setClassDateData(res.data);
        } catch {
            setClassDateData({ counts: {}, myBookings: {} });
        }
    }, [classDateCache]);

    useEffect(() => {
        if (tab === "classes") {
            fetchClassDataForDay(activeDay);
        }
    }, [tab, activeDay, fetchClassDataForDay]);

    const handleBook = async (lessonId: string) => {
        setBookingLoading(lessonId);
        setBookingError(null);
        const date = getNextDateForDay(activeDay);
        try {
            await api.post("/reservations", { lessonId, date });
            await fetchClassDataForDay(activeDay, true);
        } catch (err: any) {
            setBookingError(err?.response?.data?.message ?? "Could not book class.");
        } finally {
            setBookingLoading(null);
        }
    };

    const handleCancel = async (reservationId: string, lessonId: string) => {
        setBookingLoading(lessonId);
        setBookingError(null);
        try {
            await api.delete(`/reservations/${reservationId}`);
            await fetchClassDataForDay(activeDay, true);
        } catch (err: any) {
            setBookingError(err?.response?.data?.message ?? "Could not cancel booking.");
        } finally {
            setBookingLoading(null);
        }
    };

    const handlePay = async (planId: string) => {
        setPayLoading(planId);
        try {
            const res = await api.post<{ url: string }>("/stripe/checkout", {
                planId,
                successUrl: `${window.location.origin}/payment/success`,
                cancelUrl: `${window.location.origin}/member`,
            });
            window.location.href = res.data.url;
        } catch {
            setPayLoading(null);
            alert("Could not start payment. Please try again.");
        }
    };

    const days = daysUntil(profile?.membership_expires_at ?? null);
    const isExpired = days !== null && days < 0;
    const isExpiringSoon = days !== null && days >= 0 && days <= 7;

    const avatarInitials = user?.name
        ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
        : "?";

    const classesByDay = DAYS.map((_, i) =>
        classes.filter((c) => c.day_of_week === i)
            .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day))
    );

    if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
            {/* TOP BAR */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                <div className="logo" style={{ fontSize: 16 }}>{gym?.name ?? "GymOS"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--bg)" }}>
                        {avatarInitials}
                    </div>
                    <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{user?.name}</span>
                    <button onClick={logout} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "var(--muted2)", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Sign out</button>
                </div>
            </div>

            <div style={{ flex: 1, padding: "40px 32px", maxWidth: 680, margin: "0 auto", width: "100%" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Member portal</p>
                <h1 className="hero-title" style={{ fontSize: "clamp(40px, 5vw, 64px)", marginBottom: 32 }}>
                    Hey, <span className="hi">{user?.name?.split(" ")[0]}.</span>
                </h1>

                {profile && !profile.active ? (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--danger-border)", borderRadius: 16, padding: 32, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--danger)" }} />
                        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
                        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 900, fontSize: 28, color: "var(--danger)", marginBottom: 12 }}>Account deactivated</div>
                        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>Contact {gym?.name ?? "your gym"} to resolve this.</p>
                    </div>
                ) : (
                    <>
                        {/* TABS */}
                        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "var(--surface)", borderRadius: 10, padding: 4, border: "1px solid var(--border)", width: "fit-content" }}>
                            {(["membership", "classes"] as Tab[]).map((t) => (
                                <button key={t} onClick={() => setTab(t)} style={{
                                    padding: "8px 20px", borderRadius: 7,
                                    background: tab === t ? "var(--accent)" : "transparent",
                                    color: tab === t ? "var(--bg)" : "var(--muted)",
                                    border: "none", cursor: "pointer",
                                    fontFamily: "DM Sans, sans-serif", fontWeight: tab === t ? 600 : 400,
                                    fontSize: 14, transition: "all .2s", textTransform: "capitalize",
                                }}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* MEMBERSHIP TAB */}
                        {tab === "membership" && (
                            <>
                                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, marginBottom: 16, position: "relative", overflow: "hidden" }}>
                                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: isExpired ? "var(--danger)" : "linear-gradient(90deg, var(--accent), transparent)" }} />
                                    <div className="kpi-label" style={{ marginBottom: 16 }}>Membership</div>

                                    {profile?.membership_plan ? (
                                        <>
                                            <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 900, fontSize: 36, color: "var(--text)", marginBottom: 4 }}>
                                                {profile.membership_plan.name}
                                            </div>
                                            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
                                                €{profile.membership_plan.price} / {profile.membership_plan.duration_months === 1 ? "month" : `${profile.membership_plan.duration_months} months`}
                                            </div>

                                            {isExpired ? (
                                                <div>
                                                    <div style={{ background: "var(--danger-subtle)", border: "1px solid var(--danger-border)", borderRadius: 10, padding: "14px 18px", color: "var(--danger)", fontSize: 14, marginBottom: 16 }}>
                                                        ⚠ Expired on {formatDate(profile.membership_expires_at)}
                                                    </div>
                                                    {stripeEnabled && (
                                                        <button onClick={() => setShowPlans(!showPlans)} className="btn-p" style={{ width: "auto", padding: "12px 24px", fontSize: 14 }}>
                                                            Renew membership →
                                                        </button>
                                                    )}
                                                </div>
                                            ) : isExpiringSoon ? (
                                                <div>
                                                    <div style={{ background: "rgba(255,180,0,0.06)", border: "1px solid rgba(255,180,0,0.2)", borderRadius: 10, padding: "14px 18px", color: "#FFB400", fontSize: 14, marginBottom: 16 }}>
                                                        ⏳ Expires in {days} day{days !== 1 ? "s" : ""} — {formatDate(profile.membership_expires_at)}
                                                    </div>
                                                    {stripeEnabled && (
                                                        <button onClick={() => setShowPlans(!showPlans)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,180,0,0.3)", color: "#FFB400", fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                                                            Renew early →
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)", borderRadius: 10, padding: "14px 18px", color: "var(--accent)", fontSize: 14 }}>
                                                    ✓ Active until {formatDate(profile.membership_expires_at)}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div>
                                            <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: stripeEnabled ? 20 : 0 }}>
                                                No active membership.{stripeEnabled ? " Choose a plan to get started." : " Contact your gym to get started."}
                                            </div>
                                            {stripeEnabled && (
                                                <button onClick={() => setShowPlans(!showPlans)} className="btn-p" style={{ width: "auto", padding: "12px 24px", fontSize: 14 }}>
                                                    View plans →
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {stripeEnabled && showPlans && plans.length > 0 && (
                                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
                                        <div className="kpi-label" style={{ marginBottom: 16 }}>Choose a plan</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            {plans.map((plan) => (
                                                <div key={plan.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12 }}>
                                                    <div>
                                                        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--text)", textTransform: "uppercase" }}>{plan.name}</div>
                                                        <div style={{ fontSize: 13, color: "var(--muted)" }}>
                                                            {plan.duration_months === 1 ? "1 month" : `${plan.duration_months} months`}
                                                            {plan.description ? ` · ${plan.description}` : ""}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 22, color: "var(--accent)" }}>€{plan.price}</div>
                                                        <button onClick={() => handlePay(plan.id)} disabled={payLoading === plan.id} style={{ padding: "10px 18px", borderRadius: 8, background: "var(--accent)", color: "var(--bg)", border: "none", fontSize: 13, fontFamily: "DM Sans, sans-serif", fontWeight: 600, cursor: "pointer" }}>
                                                            {payLoading === plan.id ? "..." : "Pay →"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div className="kpi-label" style={{ marginBottom: 4 }}>Account</div>
                                        <div style={{ fontSize: 14, color: "var(--text-dim)" }}>{user?.email}</div>
                                    </div>
                                    <span className="badge active">active</span>
                                </div>
                            </>
                        )}

                        {/* CLASSES TAB */}
                        {tab === "classes" && (
                            <>
                                {/* DAY SELECTOR */}
                                <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
                                    {DAYS_SHORT.map((day, i) => {
                                        const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                                        return (
                                            <button key={i} onClick={() => setActiveDay(i)} style={{
                                                padding: "8px 14px", borderRadius: 8, whiteSpace: "nowrap",
                                                background: activeDay === i ? "var(--accent)" : "var(--surface)",
                                                border: `1px solid ${activeDay === i ? "var(--accent)" : isToday ? "var(--accent-border)" : "var(--border)"}`,
                                                color: activeDay === i ? "var(--bg)" : "var(--muted)",
                                                fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                                                fontWeight: isToday ? 600 : 400,
                                            }}>
                                                {day}{isToday && activeDay !== i && <span style={{ marginLeft: 4, fontSize: 10, color: "var(--accent)" }}>•</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                        <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text)", textTransform: "uppercase" }}>{DAYS[activeDay]}</span>
                                        <span style={{ fontSize: 13, color: "var(--muted2)", marginLeft: 10 }}>{classesByDay[activeDay].length} class{classesByDay[activeDay].length !== 1 ? "es" : ""}</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: "var(--muted2)" }}>{getNextDateForDay(activeDay)}</span>
                                </div>

                                {bookingError && (
                                    <div style={{ background: "var(--danger-subtle)", border: "1px solid var(--danger-border)", borderRadius: 8, padding: "10px 14px", color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
                                        {bookingError}
                                    </div>
                                )}

                                {classesByDay[activeDay].length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted2)", fontSize: 14, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
                                        No classes on {DAYS[activeDay]}.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {classesByDay[activeDay].map((c) => {
                                            const bookedCount = classDateData.counts[c.id] ?? 0;
                                            const myReservationId = classDateData.myBookings[c.id];
                                            const isBooked = !!myReservationId;
                                            const isFull = c.capacity_enforced && bookedCount >= c.capacity;
                                            const isLoading = bookingLoading === c.id;

                                            return (
                                                <div key={c.id} style={{
                                                    background: isBooked ? "var(--accent-subtle)" : "var(--surface)",
                                                    border: `1px solid ${isBooked ? "var(--accent-border)" : "var(--border)"}`,
                                                    borderRadius: 14, padding: "18px 20px",
                                                    display: "flex", alignItems: "center", gap: 16,
                                                }}>
                                                    <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 22, color: "var(--accent)", minWidth: 52 }}>
                                                        {c.time_of_day.slice(0, 5)}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 17, color: "var(--text)", textTransform: "uppercase", marginBottom: 2 }}>{c.title}</div>
                                                        <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                                                            {c.duration_minutes && <span>⏱ {c.duration_minutes} min</span>}
                                                            {c.instructor && <span>👤 {c.instructor}</span>}
                                                            <span style={{ color: isFull ? "var(--danger)" : "var(--muted)" }}>
                                                                👥 {bookedCount}/{c.capacity}{isFull ? " — full" : ""}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {isBooked ? (
                                                            <button
                                                                onClick={() => handleCancel(myReservationId, c.id)}
                                                                disabled={isLoading}
                                                                style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontFamily: "DM Sans, sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}
                                                            >
                                                                {isLoading ? "..." : "✓ Booked · Cancel"}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleBook(c.id)}
                                                                disabled={isLoading || isFull}
                                                                style={{ padding: "8px 16px", borderRadius: 8, background: isFull ? "transparent" : "var(--accent)", border: isFull ? "1px solid var(--border)" : "none", color: isFull ? "var(--muted2)" : "var(--bg)", fontSize: 12, fontFamily: "DM Sans, sans-serif", fontWeight: 600, cursor: isFull ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                                                            >
                                                                {isLoading ? "..." : isFull ? "Full" : "Book →"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}