import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const headersList = await headers();
    const host = headersList.get("host") || "";

    // Extract subdomain (works for sga.gymos.io and localhost)
    const subdomain = host.split(".")[0].replace(":3000", "");

    let gymName = "GymOS";
    let brandColor = "#e6a817";

    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/gyms/resolve?subdomain=${subdomain}`,
            { next: { revalidate: 3600 } } // cache 1u
        );
        if (res.ok) {
            const gym = await res.json();
            gymName = gym.name ?? "GymOS";
            brandColor = gym.brand_color ?? "#e6a817";
        }
    } catch {
        // fallback to defaults
    }

    return {
        name: gymName,
        short_name: gymName,
        description: `${gymName} — powered by GymOS`,
        start_url: "/dashboard",
        display: "standalone",
        orientation: "portrait",
        background_color: "#18181b",
        theme_color: brandColor,
        icons: [
            {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}