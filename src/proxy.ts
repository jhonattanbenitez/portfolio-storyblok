import { NextRequest, NextResponse } from "next/server";
import { SECURITY_HEADERS } from "../utils/security";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/es" || pathname.startsWith("/es/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/es-co${pathname.slice(3)}`;
    return NextResponse.redirect(url, 308);
  }

  const locale = pathname === "/es-co" || pathname.startsWith("/es-co/")
    ? "es-co"
    : "en";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-language", locale);

  // Security headers
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Content Security Policy - Updated for reCAPTCHA
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://a.storyblok.com https://app.storyblok.com https://www.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https://a-us.storyblok.com https://img2.storyblok.com https://www.google-analytics.com",
    "connect-src 'self' https://api-us.storyblok.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
    "frame-src https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://app.storyblok.com",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Block access to sensitive files
  if (
    pathname.startsWith("/.env") ||
    pathname.startsWith("/.git") ||
    pathname.startsWith("/.next") ||
    pathname.startsWith("/node_modules") ||
    pathname.includes("..")
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Rate limiting headers (basic implementation)
  response.headers.set("x-ratelimit-limit", "100");
  response.headers.set("x-ratelimit-remaining", "99");

  // Cache control for static assets
  if (pathname.startsWith("/_next/static/")) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  } else if (pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "public, max-age=0, s-maxage=86400");
  }

  // Security: Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Security: XSS Protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Security: Referrer Policy
  response.headers.set("Referrer-Policy", "origin-when-cross-origin");

  // Security: HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Security: Permissions Policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
