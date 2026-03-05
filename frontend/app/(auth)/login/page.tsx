"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useGym } from "@/context/GymContext";

export default function LoginPage() {
    const { login, resetPassword } = useAuth();
    const { gym } = useGym();

    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState("");
    const [loading, setLoading]   = useState(false);

    // Forgot password state
    const [showForgot, setShowForgot]       = useState(false);
    const [forgotEmail, setForgotEmail]     = useState("");
    const [forgotSent, setForgotSent]       = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError]     = useState("");

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await login(email, password, gym?.id);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? "Invalid email or password.";
            setError(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async () => {
        if (!forgotEmail.trim()) {
            setForgotError("Please enter your email.");
            return;
        }
        setForgotError("");
        setForgotLoading(true);
        try {
            await resetPassword(forgotEmail.trim());
            setForgotSent(true);
        } catch {
            setForgotError("Could not send reset email. Please try again.");
        } finally {
            setForgotLoading(false);
        }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleLogin();
    };

    const gymName = gym?.name ?? "GymOS";

    return (
        <div className="split">
            {/* ── LEFT ── */}
            <div className="panel-left">
                <div className="noise" />
                <div className="accent-bar" />
                <div className="logo">{gymName}</div>
                <div style={{ position: "relative", zIndex: 2 }}>
                    <p className="eyebrow">Welcome back</p>
                    <h2 className="hero-title">
                        Ready to
                        <span className="hi">perform.</span>
                    </h2>
                    <p className="hero-sub">
                        Your gym operations, members and revenue — all in one
                        place. Pick up where you left off.
                    </p>
                </div>
                <div className="stats">
                    <div>
                        <div className="stat-num">Today</div>
                        <div className="stat-lbl">Your gym is live</div>
                    </div>
                    <div>
                        <div className="stat-num">1 app</div>
                        <div className="stat-lbl">Members, classes & revenue</div>
                    </div>
                </div>
            </div>

            {/* ── RIGHT ── */}
            <div className="panel-right">
                {!showForgot ? (
                    /* ── LOGIN FORM ── */
                    <div className="form-wrap slide-in">
                        <h2 className="fh">
                            Sign
                            <br />
                            in
                        </h2>
                        <p className="fs">
                            {gym ? `${gym.name} member portal.` : "Manage your gym operations."}
                        </p>

                        {error && <div className="error-msg">{error}</div>}

                        <div className="field">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="alex@example.be"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={onKey}
                                autoComplete="email"
                            />
                        </div>

                        <div className="field">
                            <label>Password</label>
                            <input
                                type="password"
                                placeholder="••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={onKey}
                                autoComplete="current-password"
                            />
                        </div>

                        <div className="forgot">
                            <button
                                onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                                style={{
                                    background: "none", border: "none",
                                    cursor: "pointer", padding: 0,
                                    color: "var(--accent)", fontSize: 13,
                                    fontFamily: "DM Sans, sans-serif",
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>

                        <button className="btn-p" onClick={handleLogin} disabled={loading}>
                            {loading ? "Signing in..." : "Sign in →"}
                        </button>

                        <p className="auth-foot">
                            No account yet?{" "}
                            <Link href="/signup">Create one</Link>
                        </p>
                    </div>
                ) : (
                    /* ── FORGOT PASSWORD FORM ── */
                    <div className="form-wrap slide-in">
                        <h2 className="fh">
                            Reset
                            <br />
                            password
                        </h2>

                        {!forgotSent ? (
                            <>
                                <p className="fs">
                                    Enter your email and we'll send you a reset link.
                                </p>

                                {forgotError && <div className="error-msg">{forgotError}</div>}

                                <div className="field">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        placeholder="alex@example.be"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleForgot()}
                                        autoComplete="email"
                                    />
                                </div>

                                <button className="btn-p" onClick={handleForgot} disabled={forgotLoading}>
                                    {forgotLoading ? "Sending..." : "Send reset link →"}
                                </button>

                                <button
                                    onClick={() => setShowForgot(false)}
                                    className="btn-ghost"
                                    style={{ marginTop: 12 }}
                                >
                                    ← Back to sign in
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="fs">
                                    Reset link sent to <strong>{forgotEmail}</strong>. Check your inbox.
                                </p>
                                <button
                                    onClick={() => { setShowForgot(false); setForgotSent(false); }}
                                    className="btn-p"
                                >
                                    ← Back to sign in
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}