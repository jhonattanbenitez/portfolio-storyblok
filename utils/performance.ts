import React from 'react';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}
export {};


// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private readonly metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(label: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${label}-start`);
    }
  }

  endTiming(label: string): number {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label)[0];
      const duration = measure ? measure.duration : 0;
      
      this.metrics.set(label, duration);
      
      // Log slow operations in development
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    return 0;
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Web Vitals monitoring
export function reportWebVitals(metric: { name: string; value: number; id: string }) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric);
  }
  
  // Send to analytics service
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    (window as Window & { gtag: Function }).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

// Bundle size monitoring
export function logBundleSize() {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const totalSize = scripts.reduce((total, script) => {
      const src = (script as HTMLScriptElement).src;
      if (src.includes('_next/static')) {
        // This is a rough estimate - in production you'd want more accurate measurement
        return total + 50000; // Estimated 50KB per chunk
      }
      return total;
    }, 0);
    
    console.log(`Estimated bundle size: ${(totalSize / 1024).toFixed(2)}KB`);
  }
}

// Memory usage monitoring (development only)
export function logMemoryUsage() {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    console.log('Memory usage:', {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
    });
  }
}

// Lazy loading helper
export function createLazyComponent<T extends React.ComponentType<unknown>>(
  importFunc: () => Promise<{ default: T }>
) {
  return React.lazy(importFunc);
}

// Preload critical resources
export function preloadCriticalResources() {
  if (typeof window !== 'undefined') {
    // Preload critical fonts
    const fontPreload = document.createElement('link');
    fontPreload.rel = 'preload';
    fontPreload.href = '/fonts/inter.woff2';
    fontPreload.as = 'font';
    fontPreload.type = 'font/woff2';
    fontPreload.crossOrigin = 'anonymous';
    document.head.appendChild(fontPreload);
  }
}

// Image optimization helper
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality: number = 80
): string {
  if (!url) return '';
  
  // If it's already a Storyblok image, add optimization parameters
  if (url.includes('storyblok.com')) {
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', quality.toString());
    params.set('f', 'webp');
    
    return `${url}?${params.toString()}`;
  }
  
  return url;
}
