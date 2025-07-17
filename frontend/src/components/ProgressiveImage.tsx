import React, { useState, useEffect, useRef, useCallback } from 'react';
import { imageCacheService } from '../services/imageCacheService';

export interface ProgressiveImageProps {
  src: string;
  lowQualitySrc?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  loading?: 'lazy' | 'eager';
  placeholder?: React.ReactNode;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  lowQualitySrc,
  alt,
  className = '',
  style,
  onLoad,
  onError,
  loading = 'lazy',
  placeholder,
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false);
  const [highQualityLoaded, setHighQualityLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle progressive loading
  const loadImage = useCallback(async () => {
    if (!src) return;

    setIsLoading(true);
    setHasError(false);

    try {
      const result = await imageCacheService.loadProgressiveImage({
        lowQualityUrl: lowQualitySrc,
        highQualityUrl: src,
        onLowQualityLoad: () => {
          setLowQualityLoaded(true);
        },
        onHighQualityLoad: () => {
          setHighQualityLoaded(true);
          setIsLoading(false);
          onLoad?.();
        },
        onError: (error) => {
          setHasError(true);
          setIsLoading(false);
          onError?.(error);
        },
      });

      // Set the appropriate source
      if (result.lowQualityUrl && !highQualityLoaded) {
        setCurrentSrc(result.lowQualityUrl);
      }
      
      if (result.highQualityUrl) {
        setCurrentSrc(result.highQualityUrl);
      }
    } catch (error) {
      setHasError(true);
      setIsLoading(false);
      onError?.(error as Error);
    }
  }, [src, lowQualitySrc, onLoad, onError, highQualityLoaded]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (loading === 'lazy' && imgRef.current) {
      try {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            const [entry] = entries;
            if (entry.isIntersecting) {
              loadImage();
              observerRef.current?.disconnect();
            }
          },
          {
            rootMargin: '50px', // Start loading 50px before the image comes into view
          }
        );

        if (observerRef.current && typeof observerRef.current.observe === 'function') {
          observerRef.current.observe(imgRef.current);
        } else {
          // Fallback to eager loading if IntersectionObserver is not available
          loadImage();
        }

        return () => {
          observerRef.current?.disconnect();
        };
      } catch (error) {
        // Fallback to eager loading if IntersectionObserver fails
        console.warn('IntersectionObserver not available, falling back to eager loading');
        loadImage();
      }
    } else if (loading === 'eager') {
      loadImage();
    }
  }, [loading, loadImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentSrc && currentSrc.startsWith('blob:')) {
        URL.revokeObjectURL(currentSrc);
      }
    };
  }, [currentSrc]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    if (!lowQualityLoaded && lowQualitySrc) {
      setLowQualityLoaded(true);
    } else if (!highQualityLoaded) {
      setHighQualityLoaded(true);
      setIsLoading(false);
      onLoad?.();
    }
  }, [lowQualityLoaded, highQualityLoaded, lowQualitySrc, onLoad]);

  // Handle image error
  const handleImageError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
  }, [src, onError]);

  // Render loading placeholder
  if (isLoading && !currentSrc) {
    return (
      <div 
        ref={imgRef}
        className={`progressive-image-placeholder ${className}`}
        style={style}
        role="img"
        aria-label={`Loading ${alt}`}
      >
        {placeholder || (
          <div className="progressive-image-loading">
            <div className="progressive-image-spinner" />
            <span>Loading...</span>
          </div>
        )}
      </div>
    );
  }

  // Render error state
  if (hasError) {
    return (
      <div 
        className={`progressive-image-error ${className}`}
        style={style}
        role="img"
        aria-label={`Failed to load ${alt}`}
      >
        <div className="progressive-image-error-content">
          <span>⚠️</span>
          <span>Failed to load image</span>
        </div>
      </div>
    );
  }

  // Render image
  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={`progressive-image ${className} ${
        lowQualityLoaded && !highQualityLoaded ? 'progressive-image--low-quality' : ''
      } ${
        highQualityLoaded ? 'progressive-image--high-quality' : ''
      }`}
      style={style}
      onLoad={handleImageLoad}
      onError={handleImageError}
      loading={loading}
    />
  );
};