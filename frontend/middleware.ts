import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED   = ["/dashboard", "/member"];
const AUTH_ROUTES = ["/login", "/signup"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("gymos_token")?.value;

    // Extract subdomain from host header for downstream use
    const host = request.headers.get("host") ?? "";
    const subdomain = extractSubdomain(host);

    const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
    const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

    if (isProtected && !token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Pass subdomain downstream via header so server components can read it
    const response = NextResponse.next();
    if (subdomain) {
        response.headers.set("x-subdomain", subdomain);
    }

    return response;
}

function extractSubdomain(host: string): string | null {
    const parts = host.split(".");
    if (parts.length >= 2 && parts[0] !== "www") {
        const isLocalhost = host === "localhost" || host.startsWith("localhost:");
        const isBareDomain = parts.length === 2 && !host.includes("localhost");
        if (!isLocalhost && !isBareDomain) {
            return parts[0];
        }
    }
    return null;
}

export const config = {
    matcher: ["/dashboard/:path*", "/member/:path*", "/login", "/signup"],
};