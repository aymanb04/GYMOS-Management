import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GymProvider } from "@/context/GymContext";
import { headers } from "next/headers";

export const metadata: Metadata = {
    title: "GymOS",
    description: "Built for serious gyms.",
};

export default async function RootLayout({
                                             children,
                                         }: {
    children: React.ReactNode;
}) {
    // Inject brand color server-side to avoid flash of wrong color on load
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const subdomain = host.split(".")[0].replace(":3000", "");

    let brandColor = "#CAFF00"; // default fallback

    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/gyms/resolve?subdomain=${subdomain}`,
            { next: { revalidate: 3600 } }
        );
        if (res.ok) {
            const gym = await res.json();
            brandColor = gym.brand_color ?? "#CAFF00";
        }
    } catch {}

    return (
        <html lang="en" style={{ ["--accent" as string]: brandColor }}>
        <head>
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <meta name="apple-mobile-web-app-title" content="GymOS" />
            <link rel="apple-touch-icon" href="/icons/icon-192.png" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap"
                rel="stylesheet"
            />
        </head>
        {/* suppressHydrationWarning: browser extensions (MetaMask etc.) inject
            attributes into <body> before React hydrates — this suppresses that noise */}
        <body suppressHydrationWarning>
        <GymProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </GymProvider>
        </body>
        </html>
    );
}