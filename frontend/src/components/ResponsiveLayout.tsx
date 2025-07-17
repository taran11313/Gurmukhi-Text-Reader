import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import './ResponsiveLayout.css';

export interface ResponsiveLayoutProps {
  children: React.ReactNode;
  currentPage: number;
  totalPages: number;
  onPageChange?: (pageNumber: number) => void;
  className?: string;
}

export interface ScreenSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) => {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  // Accessibility context
  const { announceToScreenReader, settings } = useAccessibility();

  // Update screen size on window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch gesture handling for mobile navigation with accessibility
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!screenSize.isMobile || !onPageChange || settings.reducedMotion) return;

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, [screenSize.isMobile, onPageChange, settings.reducedMotion]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!screenSize.isMobile || !onPageChange || !touchStartRef.current || settings.reducedMotion) return;

    const touch = event.changedTouches[0];
    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    const startTouch = touchStartRef.current;
    const endTouch = touchEndRef.current;

    // Calculate swipe distance and time
    const deltaX = endTouch.x - startTouch.x;
    const deltaY = endTouch.y - startTouch.y;
    const deltaTime = endTouch.time - startTouch.time;

    // Minimum swipe distance and maximum time for gesture recognition
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    // Check if it's a valid horizontal swipe
    if (
      Math.abs(deltaX) > minSwipeDistance &&
      Math.abs(deltaY) < Math.abs(deltaX) / 2 &&
      deltaTime < maxSwipeTime
    ) {
      if (deltaX > 0 && currentPage > 1) {
        // Swipe right - go to previous page
        const newPage = currentPage - 1;
        onPageChange(newPage);
        announceToScreenReader(`Swiped to previous page, page ${newPage} of ${totalPages}`);
      } else if (deltaX < 0 && currentPage < totalPages) {
        // Swipe left - go to next page
        const newPage = currentPage + 1;
        onPageChange(newPage);
        announceToScreenReader(`Swiped to next page, page ${newPage} of ${totalPages}`);
      }
    }

    // Reset touch references
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [screenSize.isMobile, onPageChange, currentPage, totalPages, settings.reducedMotion, announceToScreenReader]);

  // Prevent default touch behavior to avoid scrolling issues
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!screenSize.isMobile || !touchStartRef.current) return;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // If horizontal movement is greater than vertical, prevent default scrolling
    if (deltaX > deltaY) {
      event.preventDefault();
    }
  }, [screenSize.isMobile]);

  // Get layout classes based on screen size
  const getLayoutClasses = () => {
    const baseClasses = ['responsive-layout'];
    
    if (screenSize.isMobile) {
      baseClasses.push('responsive-layout--mobile');
    } else if (screenSize.isTablet) {
      baseClasses.push('responsive-layout--tablet');
    } else {
      baseClasses.push('responsive-layout--desktop');
    }

    if (className) {
      baseClasses.push(className);
    }

    return baseClasses.join(' ');
  };

  return (
    <div
      ref={containerRef}
      className={getLayoutClasses()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      data-screen-size={screenSize.isMobile ? 'mobile' : screenSize.isTablet ? 'tablet' : 'desktop'}
      role="application"
      aria-label="Punjabi religious text reader"
      aria-describedby="layout-instructions"
    >
      {/* Accessibility instructions */}
      <div id="layout-instructions" className="sr-only">
        <p>
          This is a religious text reader. Use arrow keys or page up/down to navigate between pages.
          {screenSize.isMobile && !settings.reducedMotion && ' On mobile, you can also swipe left or right to navigate.'}
          Use + and - keys to zoom in and out of the text.
        </p>
      </div>

      {/* Touch gesture indicator for mobile */}
      {screenSize.isMobile && !settings.reducedMotion && (
        <div 
          className="responsive-layout__gesture-hint"
          role="status"
          aria-live="polite"
          aria-label="Touch navigation instructions"
        >
          <span className="responsive-layout__gesture-text">
            Swipe left/right to navigate pages
          </span>
        </div>
      )}

      {/* Main content area */}
      <div 
        className="responsive-layout__content"
        role="main"
        id="main-content"
        aria-label="Page content area"
      >
        {children}
      </div>

      {/* Screen size debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="responsive-layout__debug"
          role="status"
          aria-label="Development debug information"
        >
          <small>
            {screenSize.width}×{screenSize.height} - 
            {screenSize.isMobile ? ' Mobile' : screenSize.isTablet ? ' Tablet' : ' Desktop'}
          </small>
        </div>
      )}

      {/* Live region for screen reader announcements */}
      <div
        id="layout-announcements"
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
};