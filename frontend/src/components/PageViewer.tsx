import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ProgressiveImage } from './ProgressiveImage';
import { preloadService } from '../services/preloadService';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { usePageLoadRetry } from '../hooks/useRetry';
import { ErrorMessage, ImageLoadError } from './ErrorMessage';
import { LoadingState, ImageLoadingState } from './LoadingState';
import { RetryButton, ImageRetryButton } from './RetryButton';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { AriaUtils } from '../utils/accessibility';
import './PageViewer.css';
import './ProgressiveImage.css';

export interface PageViewerProps {
  pageNumber: number;
  totalPages: number;
  imageUrl: string;
  onPageChange?: (pageNumber: number) => void;
  onImageLoad?: () => void;
  onImageError?: (error: Error) => void;
}

export const PageViewer: React.FC<PageViewerProps> = ({
  pageNumber,
  totalPages,
  imageUrl,
  onPageChange: _onPageChange,
  onImageLoad,
  onImageError,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageError, setImageError] = useState<Error | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageLoadStartRef = useRef<number>(0);
  
  // Accessibility context
  const { announceToScreenReader } = useAccessibility();
  
  // Generate unique IDs for ARIA relationships
  const zoomControlsId = AriaUtils.generateId('zoom-controls');
  const imageContainerId = AriaUtils.generateId('image-container');
  const pageInfoId = AriaUtils.generateId('page-info');
  
  // Performance monitoring
  const { trackImageLoad } = usePerformanceMonitor({
    enableCustomMetrics: true,
  });

  // Retry mechanism for image loading
  const imageRetry = usePageLoadRetry(
    async () => {
      setIsImageLoading(true);
      setImageError(null);
      
      // Simulate image loading by creating a promise that resolves when image loads
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(imageUrl);
        img.onerror = () => reject(new Error(`Failed to load page ${pageNumber} image`));
        img.src = imageUrl;
      });
    },
    {
      maxAttempts: 3,
      delay: 2000,
      onRetry: (attempt, error) => {
        console.log(`Retrying image load for page ${pageNumber}, attempt ${attempt}:`, error);
      },
      onMaxAttemptsReached: (error) => {
        console.error(`Max retry attempts reached for page ${pageNumber}:`, error);
        setImageError(error);
      }
    }
  );

  // Reset zoom when page changes
  useEffect(() => {
    setZoomLevel(1);
  }, [pageNumber]);

  // Preload adjacent pages for better performance
  useEffect(() => {
    preloadService.preloadAdjacentPages(pageNumber, totalPages);
    
    // Cleanup old preloaded pages
    preloadService.cleanupOldPages(pageNumber);
  }, [pageNumber, totalPages]);

  // Handle image load success with performance tracking
  const handleImageLoad = useCallback(() => {
    if (imageLoadStartRef.current > 0) {
      const loadTime = performance.now() - imageLoadStartRef.current;
      trackImageLoad(imageUrl, loadTime);
      imageLoadStartRef.current = 0;
    }
    setIsImageLoading(false);
    setImageError(null);
    onImageLoad?.();
  }, [imageUrl, trackImageLoad, onImageLoad]);

  // Handle image load error
  const handleImageError = useCallback((error: Error) => {
    console.error(`Failed to load page ${pageNumber}:`, error);
    setIsImageLoading(false);
    setImageError(error);
    onImageError?.(error);
  }, [pageNumber, onImageError]);

  // Reset error state when page changes
  useEffect(() => {
    setImageError(null);
    setIsImageLoading(false);
    imageRetry.reset();
  }, [pageNumber, imageRetry.reset]);

  // Handle retry
  const handleRetryImage = useCallback(async () => {
    try {
      await imageRetry.execute();
    } catch (error) {
      console.error('Image retry failed:', error);
    }
  }, [imageRetry.execute]);

  // Start tracking image load time
  useEffect(() => {
    imageLoadStartRef.current = performance.now();
  }, [imageUrl]);

  // Zoom controls with accessibility announcements
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoomLevel + 0.25, 3);
    setZoomLevel(newZoom);
    announceToScreenReader(`Zoomed in to ${Math.round(newZoom * 100)}%`);
  }, [zoomLevel, announceToScreenReader]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoomLevel - 0.25, 0.5);
    setZoomLevel(newZoom);
    announceToScreenReader(`Zoomed out to ${Math.round(newZoom * 100)}%`);
  }, [zoomLevel, announceToScreenReader]);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
    announceToScreenReader('Zoom reset to 100%');
  }, [announceToScreenReader]);

  // Keyboard zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          handleZoomIn();
          break;
        case '-':
          event.preventDefault();
          handleZoomOut();
          break;
        case '0':
          event.preventDefault();
          handleZoomReset();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset]);

  return (
    <main 
      className="page-viewer" 
      ref={containerRef}
      role="main"
      aria-label="Page viewer"
      aria-describedby={pageInfoId}
    >
      {/* Skip link for keyboard users */}
      <a href="#page-content" className="skip-link sr-only-focusable">
        Skip to page content
      </a>

      {/* Zoom Controls */}
      <div 
        id={zoomControlsId}
        className="page-viewer__zoom-controls"
        role="toolbar"
        aria-label="Zoom controls"
        aria-describedby={`${zoomControlsId}-help`}
      >
        <button
          className="page-viewer__zoom-btn"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 0.5}
          aria-label={`Zoom out. Current zoom: ${Math.round(zoomLevel * 100)}%`}
          title="Zoom out (- key)"
        >
          <span aria-hidden="true">−</span>
          <span className="sr-only">Zoom out</span>
        </button>
        <span 
          className="page-viewer__zoom-level"
          role="status"
          aria-live="polite"
          aria-label={`Current zoom level: ${Math.round(zoomLevel * 100)} percent`}
        >
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          className="page-viewer__zoom-btn"
          onClick={handleZoomIn}
          disabled={zoomLevel >= 3}
          aria-label={`Zoom in. Current zoom: ${Math.round(zoomLevel * 100)}%`}
          title="Zoom in (+ key)"
        >
          <span aria-hidden="true">+</span>
          <span className="sr-only">Zoom in</span>
        </button>
        <button
          className="page-viewer__zoom-btn page-viewer__zoom-reset"
          onClick={handleZoomReset}
          aria-label="Reset zoom to 100%"
          title="Reset zoom (0 key)"
        >
          Reset
        </button>
        <div id={`${zoomControlsId}-help`} className="sr-only">
          Use + and - keys to zoom, 0 to reset zoom
        </div>
      </div>

      {/* Image Container */}
      <div 
        id={imageContainerId}
        className="page-viewer__image-container"
        role="img"
        aria-label={`Page ${pageNumber} of ${totalPages} from Punjabi religious text`}
      >
        {imageError ? (
          <div 
            className="page-viewer__error-container"
            role="alert"
            aria-live="assertive"
          >
            <ImageLoadError
              message={`Failed to load page ${pageNumber}`}
              details={imageError.message}
              onRetry={handleRetryImage}
              retryLabel="Reload Image"
            />
            <ImageRetryButton
              onRetry={handleRetryImage}
              isRetrying={imageRetry.state.isRetrying}
              attemptCount={imageRetry.state.attemptCount}
              maxAttempts={3}
              lastError={imageError}
              showAttemptCount={true}
            />
          </div>
        ) : isImageLoading ? (
          <div role="status" aria-live="polite">
            <ImageLoadingState
              message={`Loading page ${pageNumber}...`}
              size="large"
            />
          </div>
        ) : (
          <div id="page-content">
            <img
              src={imageUrl}
              alt={`Page ${pageNumber} of ${totalPages} from Punjabi religious text. Zoom level: ${Math.round(zoomLevel * 100)}%`}
              className="page-viewer__image"
              style={{
                transform: `scale(${zoomLevel})`,
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
                margin: '0 auto',
              }}
              onLoad={handleImageLoad}
              onError={(e) => {
                const error = new Error(`Failed to load page ${pageNumber} image`);
                handleImageError(error);
              }}
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Page Info */}
      <div 
        id={pageInfoId}
        className="page-viewer__info"
        role="status"
        aria-live="polite"
      >
        <span className="page-viewer__page-number">
          Page {pageNumber} of {totalPages}
        </span>
      </div>

      {/* Screen reader instructions */}
      <div className="sr-only" role="region" aria-label="Navigation instructions">
        <p>Use arrow keys or Page Up/Down to navigate between pages. Use + and - keys to zoom in and out.</p>
      </div>
    </main>
  );
};