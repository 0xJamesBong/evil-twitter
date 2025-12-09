import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Rewrite /@handle to /handle for profile routes
    // This allows Twitter-like URLs while using a standard Next.js dynamic route
    // Example: /@oxjamesbong -> /oxjamesbong
    if (pathname.startsWith("/@") && pathname.length > 2) {
        const handle = pathname.slice(2); // Remove "/@"
        
        // List of static routes that should NOT be rewritten
        const staticRoutes = [
            "/settings",
            "/rewards",
            "/test",
            "/signMessage",
            "/contracts",
            "/tweets",
            "/user",
            "/org",
        ];

        // Check if this path starts with any static route
        const isStaticRoute = staticRoutes.some((route) => pathname.startsWith(route));

        // Only rewrite if it's not a static route and the handle is not empty
        if (!isStaticRoute && handle.length > 0) {
            const url = request.nextUrl.clone();
            url.pathname = `/${handle}`;
            return NextResponse.rewrite(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};

