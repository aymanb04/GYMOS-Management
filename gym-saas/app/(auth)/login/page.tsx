"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useGym } from "@/context/GymContext";

export default function LoginPage() {
    const { login } = useAuth();
    const { gym } = useGym();

    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState("");
    const [loading, setLoading]   = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await login(email, password);
        } catch {
            setError("Invalid email or password.");
        } finally {
            setLoading(false);
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
                            placeholder="alex@ironforge.be"
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
                        <a href="#">Forgot password?</a>
                    </div>

                    <button className="btn-p" onClick={handleLogin} disabled={loading}>
                        {loading ? "Signing in..." : "Sign in →"}
                    </button>

                    <p className="auth-foot">
                        No account yet?{" "}
                        <Link href="/signup">Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}