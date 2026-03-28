"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGym } from "@/context/GymContext";
import { api } from "@/lib/api";

const WAITLIST_MAX = 20;

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
    myBookings: Record<string, string>;
    waitlistCounts: Record<string, number>;
    myWaitlist: Record<string, { id: string; position: number }>;
}

interface Payment {
    id: string;
    amount: number;
    status: string;
    source: string;
    paid_at: string;
    period_start: string | null;
    period_end: string | null;
    plan_name: string;
    duration_months: number | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateShort(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getLocalToday(): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
}

function getLocalTodayIndex(): number {
    const d = new Date().toLocaleDateString("en-US", { timeZone: "Europe/Brussels", weekday: "short" });
    const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    return map[d] ?? 0;
}

function getDateForDay(dayIndex: number, weekOffset: number): string {
    const todayIndex = getLocalTodayIndex();
    const now = new Date();
    const localToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(now);
    const [y, m, d] = localToday.split("-").map(Number);
    const monday = new Date(y, m - 1, d - todayIndex);
    const target = new Date(monday);
    target.setDate(monday.getDate() + dayIndex + weekOffset * 7);
    const ty = target.getFullYear();
    const tm = String(target.getMonth() + 1).padStart(2, "0");
    const td = String(target.getDate()).padStart(2, "0");
    return `${ty}-${tm}-${td}`;
}

type Tab = "membership" | "classes" | "history";

export default function MemberPage() {
    const { user, logout } = useAuth();
    const { gym } = useGym();

    const [profile, setProfile]       = useState<MemberProfile | null>(null);
    const [classes, setClasses]       = useState<GymClass[]>([]);
    const [plans, setPlans]           = useState<Plan[]>([]);
    const [payments, setPayments]     = useState<Payment[]>([]);
    const [loading, setLoading]       = useState(true);
    const [tab, setTab]               = useState<Tab>("membership");
    const [activeDay, setActiveDay]   = useState<number>(getLocalTodayIndex());
    const [weekOffset, setWeekOffset] = useState<number>(0);
    const [payLoading, setPayLoading] = useState<string | null>(null);
    const [showPlans, setShowPlans]   = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    const [classDateData, setClassDateData] = useState<ClassDateData>({
        counts: {}, myBookings: {}, waitlistCounts: {}, myWaitlist: {},
    });
    const [bookingLoading, setBookingLoading]   = useState<string | null>(null);
    const [waitlistLoading, setWaitlistLoading] = useState<string | null>(null);
    const [bookingError, setBookingError]       = useState<string | null>(null);

    const stripeEnabled = !!gym?.features?.stripe_payments;
    const todayIndex = getLocalTodayIndex();

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

    useEffect(() => {
        if (tab === "history" && !historyLoaded) {
            api.get<Payment[]>("/stripe/payments/my")
                .then(res => setPayments(Array.isArray(res.data) ? res.data : []))
                .catch(console.error)
                .finally(() => setHistoryLoaded(true));
        }
    }, [tab, historyLoaded]);

    const fetchClassDataForDay = useCallback(async (dayIndex: number, offset: number) => {
        const date = getDateForDay(dayIndex, offset);
        try {
            const res = await api.get<ClassDateData>(`/reservations/date/${date}`);
            setClassDateData(res.data);
        } catch {
            setClassDateData({ counts: {}, myBookings: {}, waitlistCounts: {}, myWaitlist: {} });
        }
    }, []);

    useEffect(() => {
        if (tab === "classes") {
            fetchClassDataForDay(activeDay, weekOffset);
        }
    }, [tab, activeDay, weekOffset, fetchClassDataForDay]);

    const handleBook = async (lessonId: string) => {
        setBookingLoading(lessonId);
        setBookingError(null);
        const date = getDateForDay(activeDay, weekOffset);
        try {
            await api.post("/reservations", { lessonId, date });
            await fetchClassDataForDay(activeDay, weekOffset);
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
            await fetchClassDataForDay(activeDay, weekOffset);
        } catch (err: any) {
            setBookingError(err?.response?.data?.message ?? "Could not cancel booking.");
        } finally {
            setBookingLoading(null);
        }
    };

    const handleLeaveWaitlist = async (waitlistId: string, lessonId: string) => {
        setWaitlistLoading(lessonId);
        setBookingError(null);
        try {
            await api.delete(`/reservations/waitlist/${waitlistId}`);
            await fetchClassDataForDay(activeDay, weekOffset);
        } catch (err: any) {
            setBookingError(err?.response?.data?.message ?? "Could not leave waitlist.");
        } finally {
            setWaitlistLoading(null);
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
                            {(["membership", "classes", "history"] as Tab[]).map((t) => (
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
                                                <div key={plan.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 12 }}>
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
                                {/* Week toggle */}
                                <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
                                    <button
                                        onClick={() => { setWeekOffset(0); setActiveDay(todayIndex); }}
                                        style={{
                                            padding: "6px 14px", borderRadius: 8, fontSize: 12,
                                            background: weekOffset === 0 ? "var(--accent)" : "var(--surface)",
                                            color: weekOffset === 0 ? "var(--bg)" : "var(--muted)",
                                            border: `1px solid ${weekOffset === 0 ? "var(--accent)" : "var(--border)"}`,
                                            cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: 600,
                                        }}
                                    >
                                        This week
                                    </button>
                                    <button
                                        onClick={() => setWeekOffset(1)}
                                        style={{
                                            padding: "6px 14px", borderRadius: 8, fontSize: 12,
                                            background: weekOffset === 1 ? "var(--accent)" : "var(--surface)",
                                            color: weekOffset === 1 ? "var(--bg)" : "var(--muted)",
                                            border: `1px solid ${weekOffset === 1 ? "var(--accent)" : "var(--border)"}`,
                                            cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: 600,
                                        }}
                                    >
                                        Next week
                                    </button>
                                </div>

                                {/* Day selector */}
                                <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
                                    {DAYS_SHORT.map((day, i) => {
                                        const isToday = weekOffset === 0 && i === todayIndex;
                                        const isPast = weekOffset === 0 && i < todayIndex;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => !isPast && setActiveDay(i)}
                                                disabled={isPast}
                                                style={{
                                                    padding: "8px 14px", borderRadius: 8, whiteSpace: "nowrap",
                                                    background: activeDay === i ? "var(--accent)" : "var(--surface)",
                                                    border: `1px solid ${activeDay === i ? "var(--accent)" : isToday ? "var(--accent-border)" : "var(--border)"}`,
                                                    color: activeDay === i ? "var(--bg)" : isPast ? "var(--muted2)" : "var(--muted)",
                                                    opacity: isPast ? 0.35 : 1,
                                                    fontSize: 13,
                                                    cursor: isPast ? "not-allowed" : "pointer",
                                                    fontFamily: "DM Sans, sans-serif",
                                                    fontWeight: isToday ? 600 : 400,
                                                }}
                                            >
                                                {day}{isToday && activeDay !== i && <span style={{ marginLeft: 4, fontSize: 10, color: "var(--accent)" }}>•</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Day header */}
                                <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                        <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text)", textTransform: "uppercase" }}>{DAYS[activeDay]}</span>
                                        <span style={{ fontSize: 13, color: "var(--muted2)", marginLeft: 10 }}>{classesByDay[activeDay].length} class{classesByDay[activeDay].length !== 1 ? "es" : ""}</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: "var(--muted2)" }}>{getDateForDay(activeDay, weekOffset)}</span>
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
                                            const bookedCount     = classDateData.counts[c.id] ?? 0;
                                            const waitlistCount   = classDateData.waitlistCounts?.[c.id] ?? 0;
                                            const myReservationId = classDateData.myBookings[c.id];
                                            const myWaitlistEntry = classDateData.myWaitlist?.[c.id];
                                            const isBooked        = !!myReservationId;
                                            const isOnWaitlist    = !!myWaitlistEntry;
                                            const isFull          = c.capacity_enforced && bookedCount >= c.capacity;
                                            const isLoadingClass  = bookingLoading === c.id;
                                            const isLoadingWait   = waitlistLoading === c.id;
                                            const waitlistFull    = waitlistCount >= WAITLIST_MAX;

                                            return (
                                                <div key={c.id} style={{
                                                    background: isBooked ? "var(--accent-subtle)" : isOnWaitlist ? "rgba(255,180,0,0.05)" : "var(--surface)",
                                                    border: `1px solid ${isBooked ? "var(--accent-border)" : isOnWaitlist ? "rgba(255,180,0,0.25)" : "var(--border)"}`,
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
                                                                👥 {bookedCount}/{c.capacity}{isFull ? " — vol" : ""}
                                                            </span>
                                                            {isFull && waitlistCount > 0 && (
                                                                <span style={{ color: "#FFB400" }}>
                                                                    · ⏳ {waitlistCount}/{WAITLIST_MAX} wachtlijst
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {isBooked ? (
                                                            <button
                                                                onClick={() => handleCancel(myReservationId, c.id)}
                                                                disabled={isLoadingClass}
                                                                style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontFamily: "DM Sans, sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}
                                                            >
                                                                {isLoadingClass ? "..." : "✓ Booked · Cancel"}
                                                            </button>
                                                        ) : isOnWaitlist ? (
                                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                                                <span style={{ fontSize: 11, color: "#FFB400", fontWeight: 600 }}>
                                                                    #{myWaitlistEntry.position} wachtlijst
                                                                </span>
                                                                <button
                                                                    onClick={() => handleLeaveWaitlist(myWaitlistEntry.id, c.id)}
                                                                    disabled={isLoadingWait}
                                                                    style={{ padding: "6px 12px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,180,0,0.3)", color: "#FFB400", fontSize: 11, fontFamily: "DM Sans, sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}
                                                                >
                                                                    {isLoadingWait ? "..." : "Verlaat wachtlijst"}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleBook(c.id)}
                                                                disabled={isLoadingClass || (isFull && waitlistFull)}
                                                                style={{
                                                                    padding: "8px 16px", borderRadius: 8,
                                                                    background: isFull
                                                                        ? (waitlistFull ? "transparent" : "rgba(255,180,0,0.15)")
                                                                        : "var(--accent)",
                                                                    border: isFull
                                                                        ? (waitlistFull ? "1px solid var(--border)" : "1px solid rgba(255,180,0,0.3)")
                                                                        : "none",
                                                                    color: isFull
                                                                        ? (waitlistFull ? "var(--muted2)" : "#FFB400")
                                                                        : "var(--bg)",
                                                                    fontSize: 12, fontFamily: "DM Sans, sans-serif", fontWeight: 600,
                                                                    cursor: (isFull && waitlistFull) ? "not-allowed" : "pointer",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                            >
                                                                {isLoadingClass ? "..." : isFull ? (waitlistFull ? "Vol" : "Wachtlijst →") : "Book →"}
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

                        {/* HISTORY TAB */}
                        {tab === "history" && (
                            <>
                                <div style={{ marginBottom: 20 }}>
                                    <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text)", textTransform: "uppercase" }}>Payment history</span>
                                </div>

                                {!historyLoaded ? (
                                    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                                        <div className="spinner" />
                                    </div>
                                ) : payments.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted2)", fontSize: 14, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
                                        No payments yet.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {payments.map((p) => {
                                            const isPaid = p.status === "paid";
                                            const isPending = p.status === "pending";

                                            return (
                                                <div key={p.id} style={{
                                                    background: "var(--surface)",
                                                    border: `1px solid ${isPaid ? "var(--border)" : isPending ? "rgba(255,180,0,0.2)" : "var(--danger-border)"}`,
                                                    borderRadius: 14, padding: "18px 20px",
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                                                        <div>
                                                            <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--text)", textTransform: "uppercase", marginBottom: 2 }}>
                                                                {p.plan_name}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 8, alignItems: "center" }}>
                                                                <span style={{
                                                                    padding: "2px 8px", borderRadius: 4, fontSize: 10,
                                                                    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                                                                    background: isPaid ? "var(--accent-subtle)" : isPending ? "rgba(255,180,0,0.08)" : "var(--danger-subtle)",
                                                                    color: isPaid ? "var(--accent)" : isPending ? "#FFB400" : "var(--danger)",
                                                                    border: `1px solid ${isPaid ? "var(--accent-border)" : isPending ? "rgba(255,180,0,0.2)" : "var(--danger-border)"}`,
                                                                }}>
                                                                    {p.status}
                                                                </span>
                                                                <span style={{ textTransform: "capitalize" }}>{p.source}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 24, color: isPaid ? "var(--accent)" : "var(--muted)" }}>
                                                            €{Number(p.amount).toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        display: "grid",
                                                        gridTemplateColumns: p.period_start ? "1fr 1fr 1fr" : "1fr",
                                                        gap: 12, borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4,
                                                    }}>
                                                        <div>
                                                            <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted2)", marginBottom: 3 }}>Paid on</div>
                                                            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{formatDateShort(p.paid_at)}</div>
                                                        </div>
                                                        {p.period_start && (
                                                            <div>
                                                                <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted2)", marginBottom: 3 }}>Period start</div>
                                                                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{formatDateShort(p.period_start)}</div>
                                                            </div>
                                                        )}
                                                        {p.period_end && (
                                                            <div>
                                                                <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted2)", marginBottom: 3 }}>Period end</div>
                                                                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{formatDateShort(p.period_end)}</div>
                                                            </div>
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