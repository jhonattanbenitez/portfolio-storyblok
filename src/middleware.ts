import { NextRequest, NextResponse } from 'next/server';
import { detectLanguageFromHeaders, detectLanguageFromPath } from '../utils/i18n';
import { SECURITY_HEADERS } from '../utils/security';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Security headers
  const response = NextResponse.next();
  
  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://a.storyblok.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https://a-us.storyblok.com https://img2.storyblok.com https://www.google-analytics.com",
    "connect-src 'self' https://api-us.storyblok.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Language detection and redirection
  const detectedLanguage = detectLanguageFromHeaders(request.headers);
  const pathLanguage = detectLanguageFromPath(pathname);
  
  // Only redirect if user hasn't explicitly chosen a language (no language in URL)
  // and detected language is not default, and we're on the root path
  if (detectedLanguage !== 'en' && pathLanguage === 'en' && pathname === '/') {
    // Check if user has a saved language preference
    const savedLanguage = request.cookies.get('preferred-language')?.value;
    if (!savedLanguage) {
      const url = request.nextUrl.clone();
      url.pathname = `/${detectedLanguage}`;
      return NextResponse.redirect(url);
    }
  }
  
  // Handle language-specific routes
  if (pathname.startsWith('/es-co') || pathname.startsWith('/es')) {
    // Ensure proper language handling
    const language = pathname.startsWith('/es-co') ? 'es-co' : 'es';
    
    // Set language header for the request
    response.headers.set('x-language', language);
  }
  
  // Block access to sensitive files
  if (
    pathname.startsWith('/.env') ||
    pathname.startsWith('/.git') ||
    pathname.startsWith('/.next') ||
    pathname.startsWith('/node_modules') ||
    pathname.includes('..')
  ) {
    return new NextResponse('Not Found', { status: 404 });
  }
  
  // Rate limiting headers (basic implementation)
  response.headers.set('x-ratelimit-limit', '100');
  response.headers.set('x-ratelimit-remaining', '99');
  
  // Cache control for static assets
  if (pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=86400');
  }
  
  // Security: Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Security: Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Security: XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Security: Referrer Policy
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  // Security: HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Security: Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
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
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
