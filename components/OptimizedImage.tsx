import Image from 'next/image';
import { useState } from 'react';
import { ImageType } from '../utils/types';
import { getOptimizedImageUrl } from '../utils/performance';

interface OptimizedImageProps {
  image: ImageType;
  alt?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  image,
  alt,
  width,
  height,
  priority = false,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 80,
  placeholder = 'blur',
  blurDataURL,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate optimized URL
  const optimizedUrl = getOptimizedImageUrl(
    image.source,
    width,
    height,
    quality
  );

  // Generate blur placeholder
  const generateBlurDataURL = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, w, h);
    }
    return canvas.toDataURL();
  };

  const defaultBlurDataURL = blurDataURL || generateBlurDataURL(
    width || 400,
    height || 300
  );

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 text-gray-500 ${className}`}
        style={{ width, height }}
      >
        <span>Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={optimizedUrl}
        alt={alt || image.alt || image.name || 'Image'}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={placeholder === 'blur' ? defaultBlurDataURL : undefined}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className} object-cover`}
      />
      
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
