"use client";

import { useEffect, useState } from "react";

export default function OfflineBanner() {
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        const update = () => setOffline(!navigator.onLine);
        update();
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    if (!offline) return null;

    return (
        <div style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1f1f1f",
            border: "1px solid #333",
            color: "#aaa",
            fontSize: 12,
            padding: "8px 16px",
            borderRadius: 99,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 20px #000a",
        }}>
            <span style={{ color: "#e6a817" }}>●</span>
            Je bekijkt offline data — mogelijk niet up-to-date
        </div>
    );
}