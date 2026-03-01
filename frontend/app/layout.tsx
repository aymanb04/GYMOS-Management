import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GymProvider } from "@/context/GymContext";

export const metadata: Metadata = {
    title: "GymOS",
    description: "Built for serious gyms.",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <head>
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