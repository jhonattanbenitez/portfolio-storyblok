import { ImageType } from './types';

// Image optimization utilities
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  focus?: string;
  blur?: number;
}

// Default optimization settings
export const DEFAULT_IMAGE_OPTIONS: ImageOptimizationOptions = {
  quality: 80,
  format: 'webp',
  fit: 'cover',
};

// Generate optimized Storyblok image URL
export function generateStoryblokImageUrl(
  image: ImageType,
  options: ImageOptimizationOptions = {}
): string {
  if (!image?.source) {
    return '';
  }

  const {
    width,
    height,
    quality = DEFAULT_IMAGE_OPTIONS.quality,
    format = DEFAULT_IMAGE_OPTIONS.format,
    fit = DEFAULT_IMAGE_OPTIONS.fit,
    focus,
    blur,
  } = { ...DEFAULT_IMAGE_OPTIONS, ...options };

  const params = new URLSearchParams();

  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality) params.set('q', quality.toString());
  if (format) params.set('f', format);
  if (fit) params.set('fit', fit);
  if (focus) params.set('focal', focus);
  if (blur) params.set('blur', blur.toString());

  // Add Storyblok-specific parameters
  params.set('m', 'smart'); // Enable smart cropping

  return `${image.source}?${params.toString()}`;
}

// Generate responsive image sources
export function generateResponsiveImageSources(
  image: ImageType,
  baseOptions: ImageOptimizationOptions = {}
) {
  const breakpoints = [
    { width: 640, suffix: 'sm' },
    { width: 768, suffix: 'md' },
    { width: 1024, suffix: 'lg' },
    { width: 1280, suffix: 'xl' },
    { width: 1536, suffix: '2xl' },
  ];

  return breakpoints.map(({ width, suffix }) => ({
    src: generateStoryblokImageUrl(image, { ...baseOptions, width }),
    width,
    suffix,
  }));
}

// Generate srcSet for responsive images
export function generateSrcSet(
  image: ImageType,
  baseOptions: ImageOptimizationOptions = {}
): string {
  const sources = generateResponsiveImageSources(image, baseOptions);
  
  return sources
    .map(({ src, width }) => `${src} ${width}w`)
    .join(', ');
}

// Generate sizes attribute for responsive images
export function generateSizesAttribute(
  breakpoints: { minWidth: number; size: string }[]
): string {
  const sortedBreakpoints = [...breakpoints].sort((a, b) => a.minWidth - b.minWidth);
  return sortedBreakpoints
    .map(({ minWidth, size }) => `(min-width: ${minWidth}px) ${size}`)
    .join(', ') + ', 100vw';
}

// Preload critical images
export function preloadImage(
  image: ImageType,
  options: ImageOptimizationOptions = {}
): void {
  if (typeof window === 'undefined' || !image?.source) {
    return;
  }

  const optimizedUrl = generateStoryblokImageUrl(image, options);
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = optimizedUrl;
  
  if (options.width && options.height) {
    link.setAttribute('imagesizes', `${options.width}px`);
    link.setAttribute('imagesrcset', optimizedUrl);
  }
  
  document.head.appendChild(link);
}

// Lazy loading with intersection observer
export function createLazyImageObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
}

// Generate blur placeholder
export function generateBlurPlaceholder(
  width: number = 400,
  height: number = 300,
  color: string = '#f3f4f6'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }
  
  return canvas.toDataURL('image/jpeg', 0.1);
}

// Image format detection and optimization
export function getOptimalImageFormat(): 'webp' | 'avif' | 'jpeg' {
  if (typeof window === 'undefined') {
    return 'webp';
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return 'webp';
  }

  // Check AVIF support
  if (ctx.canvas.toDataURL('image/avif').startsWith('data:image/avif')) {
    return 'avif';
  }
  
  // Check WebP support
  if (ctx.canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
    return 'webp';
  }
  
  return 'jpeg';
}

// Image compression utility
export function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// Image validation
export function validateImage(image: ImageType): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!image) {
    errors.push('Image is required');
    return { isValid: false, errors };
  }
  
  if (!image.source) {
    errors.push('Image source is required');
  }
  
  if (!image.alt && !image.name) {
    errors.push('Image alt text or name is required for accessibility');
  }
  
  if (image.source && !isValidImageUrl(image.source)) {
    errors.push('Invalid image URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// URL validation helper
function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}
