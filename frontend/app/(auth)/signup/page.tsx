"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useGym } from "@/context/GymContext";

export default function SignupPage() {
    const router = useRouter();
    const { gym, gymLoading } = useGym();

    const [name, setName]         = useState("");
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState("");
    const [loading, setLoading]   = useState(false);

    const handleSignup = async () => {
        if (!name.trim())        return setError("Please enter your name.");
        if (!email.trim())       return setError("Please enter your email.");
        if (password.length < 6) return setError("Password must be at least 6 characters.");
        if (!gym)                return setError("Could not determine your gym. Please check the URL.");

        setError("");
        setLoading(true);

        try {
            await api.post("/auth/signup", {
                email,
                password,
                name,
                gymId: gym.id,  // gym_id comes from subdomain, no picker needed
            });
            router.push("/login");
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? "Signup failed. Please try again.";
            setError(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setLoading(false);
        }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSignup();
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
                    <p className="eyebrow">Join {gymName}</p>
                    <h2 className="hero-title">
                        Built for
                        <span className="hi">serious</span>
                        gyms.
                    </h2>
                    <p className="hero-sub">
                        Membership control, performance insights and financial
                        clarity — built local, for gyms that mean business.
                    </p>
                </div>

                <div className="stats">
                    <div>
                        <div className="stat-num">1 app</div>
                        <div className="stat-lbl">Members, revenue & classes</div>
                    </div>
                    <div>
                        <div className="stat-num">Local</div>
                        <div className="stat-lbl">Built for your market</div>
                    </div>
                </div>
            </div>

            {/* ── RIGHT ── */}
            <div className="panel-right">
                <div className="form-wrap slide-in">
                    <h2 className="fh">
                        Create
                        <br />
                        account
                    </h2>
                    <p className="fs">
                        {gymLoading
                            ? "Loading..."
                            : gym
                                ? `Joining ${gym.name}.`
                                : "Get started in minutes."}
                    </p>

                    {error && <div className="error-msg">{error}</div>}

                    <div className="field">
                        <label>Full name</label>
                        <input
                            placeholder="Alex Martens"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={onKey}
                            autoComplete="name"
                        />
                    </div>

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
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={onKey}
                            autoComplete="new-password"
                        />
                    </div>

                    <button
                        className="btn-p"
                        onClick={handleSignup}
                        disabled={loading || gymLoading || !gym}
                    >
                        {loading ? "Creating account..." : `Join ${gymName} →`}
                    </button>

                    <p className="auth-foot">
                        Already have an account?{" "}
                        <Link href="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}