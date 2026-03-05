"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGym } from "@/context/GymContext";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
    const router = useRouter();
    const { gym } = useGym();

    const [password, setPassword]   = useState("");
    const [confirm, setConfirm]     = useState("");
    const [error, setError]         = useState("");
    const [success, setSuccess]     = useState(false);
    const [loading, setLoading]     = useState(false);
    const [validToken, setValidToken] = useState(false);

    useEffect(() => {
        // Supabase puts the token in the URL hash after redirect
        // We need to let Supabase process it automatically
        supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setValidToken(true);
            }
        });
    }, []);

    const handleReset = async () => {
        if (!password) return setError("Please enter a new password.");
        if (password.length < 6) return setError("Password must be at least 6 characters.");
        if (password !== confirm) return setError("Passwords do not match.");

        setError("");
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => router.push("/login"), 3000);
        } catch (err: unknown) {
            setError((err as Error).message ?? "Could not reset password. Try requesting a new link.");
        } finally {
            setLoading(false);
        }
    };

    const gymName = gym?.name ?? "GymOS";

    return (
        <div className="split">
            <div className="panel-left">
                <div className="noise" />
                <div className="accent-bar" />
                <div className="logo">{gymName}</div>
                <div style={{ position: "relative", zIndex: 2 }}>
                    <p className="eyebrow">Account recovery</p>
                    <h2 className="hero-title">
                        New
                        <span className="hi">password.</span>
                    </h2>
                    <p className="hero-sub">
                        Choose a strong password to keep your account secure.
                    </p>
                </div>
            </div>

            <div className="panel-right">
                <div className="form-wrap slide-in">
                    <h2 className="fh">
                        New<br />password
                    </h2>

                    {success ? (
                        <>
                            <p className="fs" style={{ color: "var(--accent)" }}>
                                ✓ Password updated successfully. Redirecting to sign in...
                            </p>
                        </>
                    ) : !validToken ? (
                        <>
                            <p className="fs">
                                Verifying your reset link...
                            </p>
                            <div className="spinner-wrap" style={{ height: 60 }}>
                                <div className="spinner" />
                            </div>
                            <p style={{ fontSize: 13, color: "var(--muted2)", marginTop: 16 }}>
                                If nothing happens, your link may have expired.{" "}
                                <a href="/login" style={{ color: "var(--accent)" }}>
                                    Request a new one
                                </a>
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="fs">Choose a new password for your account.</p>

                            {error && <div className="error-msg">{error}</div>}

                            <div className="field">
                                <label>New password</label>
                                <input
                                    type="password"
                                    placeholder="Min. 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                                    autoComplete="new-password"
                                />
                            </div>

                            <div className="field">
                                <label>Confirm password</label>
                                <input
                                    type="password"
                                    placeholder="Repeat your password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                                    autoComplete="new-password"
                                />
                            </div>

                            <button className="btn-p" onClick={handleReset} disabled={loading}>
                                {loading ? "Updating..." : "Update password →"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}