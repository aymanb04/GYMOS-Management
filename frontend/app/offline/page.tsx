"use client";

export default function OfflinePage() {
    return (
        <div style={{
            minHeight: "100vh",
            background: "#18181b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
        }}>
            <div style={{ fontSize: 48 }}>📡</div>
            <h1 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>
                Geen verbinding
            </h1>
            <p style={{ color: "#666", fontSize: 14, maxWidth: 280, margin: 0, lineHeight: 1.6 }}>
                Je bent offline. Pagina&apos;s die je eerder bezocht hebt zijn nog beschikbaar.
            </p>
            <button
                onClick={() => window.location.reload()}
                style={{
                    marginTop: 8,
                    padding: "10px 24px",
                    background: "#e6a817",
                    color: "#111",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                }}
            >
                Opnieuw proberen
            </button>
        </div>
    );
}