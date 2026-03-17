"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGym } from "@/context/GymContext";
import { useEffect, useState } from "react";

const NAV = [
    { href: "/dashboard",          label: "Overview",  icon: "▦" },
    { href: "/dashboard/members",  label: "Members",   icon: "◎" },
    { href: "/dashboard/plans",    label: "Plans",     icon: "◇" },
    { href: "/dashboard/classes",  label: "Classes",   icon: "⊡" },
    { href: "/dashboard/revenue",  label: "Revenue",   icon: "◈" },
    { href: "/dashboard/settings", label: "Settings",  icon: "⊙" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, loading } = useAuth();
    const { gym } = useGym();
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && user?.role === "member") {
            router.replace("/member");
        }
    }, [user, loading, router]);

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        logout();
        router.replace("/login");
    };

    const avatarInitials = user?.name
        ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
        : "?";

    return (
        <div className="dash-root">
            {/* HAMBURGER — mobile only */}
            <button
                className="sb-hamburger"
                onClick={() => setSidebarOpen(s => !s)}
                aria-label="Toggle menu"
            >
                {sidebarOpen ? "✕" : "☰"}
            </button>

            {/* OVERLAY — mobile only */}
            <div
                className={`sb-overlay ${sidebarOpen ? "open" : ""}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* SIDEBAR */}
            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="sb-logo">{gym?.name ?? "GymOS"}</div>

                <span className="sb-section">Main</span>

                {NAV.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sb-item ${pathname === item.href ? "active" : ""}`}
                    >
                        <span style={{ fontSize: 14 }}>{item.icon}</span>
                        {item.label}
                    </Link>
                ))}

                <div className="sb-footer">
                    <div className="sb-user">
                        <div className="sb-avatar">{avatarInitials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="sb-uname">{user?.name ?? "—"}</div>
                            <div className="sb-ugym" style={{ textTransform: "capitalize" }}>
                                {user?.role ?? "member"}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            style={{
                                background: "none", border: "none",
                                cursor: "pointer", color: "var(--muted2)",
                                fontSize: 16, padding: 4, transition: "color .2s",
                            }}
                            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--accent)")}
                            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted2)")}
                        >
                            ⎋
                        </button>
                    </div>
                </div>
            </aside>

            <main className="dash-main">{children}</main>
        </div>
    );
}