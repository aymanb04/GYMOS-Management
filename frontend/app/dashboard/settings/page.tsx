"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGym } from "@/context/GymContext";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface ConnectStatus {
    connected: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    accountId?: string | null;
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="spinner-wrap"><div className="spinner" /></div>}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const { user, logout } = useAuth();
    const { gym } = useGym();
    const searchParams = useSearchParams();

    const stripeEnabled = !!gym?.features?.stripe_payments;

    const [gymName, setGymName]       = useState("");
    const [brandColor, setBrandColor] = useState("#CBFF00");
    const [gymSaving, setGymSaving]   = useState(false);
    const [gymSuccess, setGymSuccess] = useState(false);
    const [gymError, setGymError]     = useState("");

    const [name, setName]                       = useState("");
    const [email, setEmail]                     = useState("");
    const [newPassword, setNewPassword]         = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [accountSaving, setAccountSaving]     = useState(false);
    const [accountSuccess, setAccountSuccess]   = useState(false);
    const [accountError, setAccountError]       = useState("");
    const [passwordChanged, setPasswordChanged] = useState(false);

    const [connectStatus, setConnectStatus]     = useState<ConnectStatus | null>(null);
    const [connectLoading, setConnectLoading]   = useState(false);
    const [connectChecking, setConnectChecking] = useState(true);

    useEffect(() => {
        if (gym) { setGymName(gym.name); setBrandColor(gym.brand_color); }
        if (user) { setName(user.name); setEmail(user.email); }
    }, [gym, user]);

    useEffect(() => {
        if (user?.role !== 'admin' || !stripeEnabled) return;
        api.get<ConnectStatus>('/stripe/connect/status')
            .then((res) => setConnectStatus(res.data))
            .catch(console.error)
            .finally(() => setConnectChecking(false));
    }, [user, stripeEnabled]);

    useEffect(() => {
        if (!stripeEnabled) return;
        const stripe = searchParams.get('stripe');
        if (stripe === 'success') {
            setConnectChecking(true);
            api.get<ConnectStatus>('/stripe/connect/status')
                .then((res) => setConnectStatus(res.data))
                .finally(() => setConnectChecking(false));
        }
    }, [searchParams, stripeEnabled]);

    const handleConnectStripe = async () => {
        setConnectLoading(true);
        try {
            const returnUrl = `${window.location.origin}/dashboard/settings`;
            const res = await api.post<{ url: string }>('/stripe/connect/onboard', { returnUrl });
            window.location.href = res.data.url;
        } catch {
            setConnectLoading(false);
        }
    };

    const handleGymSave = async () => {
        if (!gymName.trim()) return setGymError("Gym name is required.");
        setGymError(""); setGymSaving(true); setGymSuccess(false);
        try {
            await api.patch(`/gyms/${gym?.id}`, { name: gymName.trim(), brand_color: brandColor });
            document.documentElement.style.setProperty("--accent", brandColor);
            const hex = brandColor.replace("#", "");
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            document.documentElement.style.setProperty("--accent-glow",   `rgba(${r},${g},${b},0.13)`);
            document.documentElement.style.setProperty("--accent-subtle", `rgba(${r},${g},${b},0.06)`);
            document.documentElement.style.setProperty("--accent-border", `rgba(${r},${g},${b},0.2)`);
            setGymSuccess(true);
            setTimeout(() => setGymSuccess(false), 3000);
        } catch { setGymError("Could not save gym settings."); }
        finally { setGymSaving(false); }
    };

    const handleAccountSave = async () => {
        if (!name.trim()) return setAccountError("Name is required.");
        if (newPassword && newPassword.length < 6) return setAccountError("Password must be at least 6 characters.");
        if (newPassword && newPassword !== confirmPassword) return setAccountError("Passwords do not match.");
        setAccountError(""); setAccountSaving(true); setAccountSuccess(false);
        try {
            await api.patch(`/members/me`, { name: name.trim(), ...(newPassword ? { password: newPassword } : {}) });
            if (newPassword) { setPasswordChanged(true); setTimeout(() => logout(), 2500); }
            else { setNewPassword(""); setConfirmPassword(""); setAccountSuccess(true); setTimeout(() => setAccountSuccess(false), 3000); }
        } catch { setAccountError("Could not save account settings."); }
        finally { setAccountSaving(false); }
    };

    const isAdmin = user?.role === "admin";

    if (passwordChanged) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
                <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 28, color: "var(--text)", marginBottom: 8 }}>Password updated</h2>
                <p style={{ fontSize: 14, color: "var(--muted)" }}>Signing you out for security...</p>
            </div>
        );
    }

    return (
        <>
            <div className="dash-header">
                <div>
                    <div className="dash-title">Settings</div>
                    <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 4 }}>Manage your gym and account</div>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 560 }}>

                {/* GYM SETTINGS */}
                {isAdmin && (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--accent), transparent)" }} />
                        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text)", marginBottom: 4, textTransform: "uppercase" }}>Gym settings</div>
                        <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 24 }}>Customize how your gym appears to members.</p>
                        {gymError && <div className="error-msg">{gymError}</div>}
                        {gymSuccess && <div style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)", borderRadius: 8, padding: "10px 14px", color: "var(--accent)", fontSize: 13, marginBottom: 16 }}>✓ Gym settings saved.</div>}
                        <div className="field">
                            <label>Gym name</label>
                            <input value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="e.g. Iron Forge Gym" />
                        </div>
                        <div className="field">
                            <label>Brand color</label>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
                                       style={{ width: 48, height: 48, borderRadius: 10, border: "1px solid var(--border)", background: "none", cursor: "pointer", padding: 2 }} />
                                <input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} placeholder="#CBFF00" style={{ flex: 1 }} />
                                <div style={{ width: 48, height: 48, borderRadius: 10, background: brandColor, border: "1px solid var(--border)", flexShrink: 0 }} />
                            </div>
                        </div>
                        <button className="btn-p" onClick={handleGymSave} disabled={gymSaving} style={{ width: "auto", padding: "12px 24px", fontSize: 14 }}>
                            {gymSaving ? "Saving..." : "Save gym settings →"}
                        </button>
                    </div>
                )}

                {/* PAYMENTS — only when stripe_payments feature is enabled */}
                {isAdmin && stripeEnabled && (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32 }}>
                        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text)", marginBottom: 4, textTransform: "uppercase" }}>Payments</div>
                        <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 24 }}>Connect your Stripe account to accept membership payments from members.</p>
                        {connectChecking ? (
                            <div style={{ fontSize: 13, color: "var(--muted2)" }}>Checking status...</div>
                        ) : connectStatus?.connected ? (
                            <div>
                                <div style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)", borderRadius: 10, padding: "14px 18px", color: "var(--accent)", fontSize: 14, marginBottom: 16 }}>
                                    ✓ Stripe account connected — payments are enabled
                                </div>
                                <div style={{ fontSize: 12, color: "var(--muted2)" }}>Account ID: {connectStatus.accountId}</div>
                            </div>
                        ) : (
                            <div>
                                {connectStatus?.accountId && !connectStatus.connected && (
                                    <div style={{ background: "rgba(255,180,0,0.06)", border: "1px solid rgba(255,180,0,0.2)", borderRadius: 10, padding: "14px 18px", color: "#FFB400", fontSize: 13, marginBottom: 16 }}>
                                        ⚠ Stripe account not fully set up. Complete onboarding to accept payments.
                                    </div>
                                )}
                                <button className="btn-p" onClick={handleConnectStripe} disabled={connectLoading} style={{ width: "auto", padding: "12px 24px", fontSize: 14 }}>
                                    {connectLoading ? "Redirecting..." : connectStatus?.accountId ? "Complete Stripe setup →" : "Connect Stripe account →"}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ACCOUNT SETTINGS */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32 }}>
                    <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text)", marginBottom: 4, textTransform: "uppercase" }}>Account settings</div>
                    <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 24 }}>Update your personal information and password.</p>
                    {accountError && <div className="error-msg">{accountError}</div>}
                    {accountSuccess && <div style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)", borderRadius: 8, padding: "10px 14px", color: "var(--accent)", fontSize: 13, marginBottom: 16 }}>✓ Account settings saved.</div>}
                    <div className="field">
                        <label>Full name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="field">
                        <label>Email</label>
                        <input value={email} disabled style={{ opacity: 0.5, cursor: "not-allowed" }} />
                        <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 4 }}>Email cannot be changed here. Contact support.</div>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 20, marginBottom: 8 }}>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Change password — leave blank to keep current password</div>
                    </div>
                    <div className="field">
                        <label>New password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" />
                    </div>
                    <div className="field">
                        <label>Confirm password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
                    </div>
                    {newPassword && (
                        <div style={{ background: "rgba(255,180,0,0.06)", border: "1px solid rgba(255,180,0,0.2)", borderRadius: 8, padding: "10px 14px", color: "#FFB400", fontSize: 12, marginBottom: 16 }}>
                            ⚠ Changing your password will sign you out.
                        </div>
                    )}
                    <button className="btn-p" onClick={handleAccountSave} disabled={accountSaving} style={{ width: "auto", padding: "12px 24px", fontSize: 14 }}>
                        {accountSaving ? "Saving..." : "Save account settings →"}
                    </button>
                </div>

                {/* DANGER ZONE */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--danger-border)", borderRadius: 16, padding: 32 }}>
                    <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 700, fontSize: 20, color: "var(--danger)", marginBottom: 4, textTransform: "uppercase" }}>Danger zone</div>
                    <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 20 }}>Irreversible actions. Be careful.</p>
                    <button style={{ padding: "10px 20px", borderRadius: 8, background: "var(--danger-subtle)", border: "1px solid var(--danger-border)", color: "var(--danger)", fontSize: 13, cursor: "not-allowed", fontFamily: "DM Sans, sans-serif", opacity: 0.6 }} disabled>
                        Delete gym account — contact support
                    </button>
                </div>
            </div>
        </>
    );
}