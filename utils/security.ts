// Security utilities and configuration

// Environment variable validation
export function validateEnvironmentVariables() {
  const requiredVars = [
    'NEXT_PUBLIC_STORYBLOK_TOKEN',
  ];
  
  const optionalVars = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN',
    'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
  ];
  
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  // Check optional variables
  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(`Missing optional environment variables: ${warnings.join(', ')}`);
  }
  
  return { missing, warnings };
}

// Content Security Policy configuration
export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for Next.js
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://a.storyblok.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind CSS
    'https://fonts.googleapis.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'data:',
  ],
  'img-src': [
    "'self'",
    'data:',
    'https://a-us.storyblok.com',
    'https://img2.storyblok.com',
    'https://www.google-analytics.com',
  ],
  'connect-src': [
    "'self'",
    'https://api-us.storyblok.com',
    'https://www.google-analytics.com',
    'https://analytics.google.com',
  ],
  'frame-src': [
    "'none'",
  ],
  'object-src': [
    "'none'",
  ],
  'base-uri': [
    "'self'",
  ],
  'form-action': [
    "'self'",
  ],
  'frame-ancestors': [
    "'none'",
  ],
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// URL validation
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// XSS protection
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// CSRF protection token generation
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Validate CSRF token
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) {
    return false;
  }
  
  return token === sessionToken;
}

// API key validation
export function validateAPIKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Basic validation - in production, you'd want more sophisticated validation
  return apiKey.length >= 32 && /^[a-zA-Z0-9]+$/.test(apiKey);
}

// Request logging for security monitoring
export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  severity: 'low' | 'medium' | 'high' = 'low'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Security Event:', logEntry);
  }
  
  // In production, you'd send this to a security monitoring service
  // Example: sendToSecurityService(logEntry);
}

// Headers for security
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Content validation for user-generated content
export function validateContent(content: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!content || typeof content !== 'string') {
    errors.push('Content is required');
    return { isValid: false, errors };
  }
  
  if (content.length > 10000) {
    errors.push('Content is too long (max 10,000 characters)');
  }
  
  if (content.length < 10) {
    errors.push('Content is too short (min 10 characters)');
  }
  
  // Check for potential XSS
  if (/<script|javascript:|on\w+\s*=/i.test(content)) {
    errors.push('Content contains potentially malicious code');
  }
  
  // Check for excessive special characters
  const specialCharCount = (content.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCharCount > content.length * 0.3) {
    errors.push('Content contains too many special characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
