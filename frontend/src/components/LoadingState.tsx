import React from 'react';
import './LoadingState.css';

export type LoadingVariant = 'spinner' | 'skeleton' | 'progress' | 'dots' | 'pulse';
export type LoadingSize = 'small' | 'medium' | 'large';

export interface LoadingStateProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  message?: string;
  progress?: number; // 0-100 for progress variant
  className?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  color?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'medium',
  message,
  progress,
  className = '',
  fullScreen = false,
  overlay = false,
  color,
}) => {
  const baseClasses = [
    'loading-state',
    `loading-state--${variant}`,
    `loading-state--${size}`,
    fullScreen && 'loading-state--fullscreen',
    overlay && 'loading-state--overlay',
    className
  ].filter(Boolean).join(' ');

  const renderSpinner = () => (
    <div className="loading-spinner" style={{ color }}>
      <svg className="loading-spinner__svg" viewBox="0 0 50 50">
        <circle
          className="loading-spinner__circle"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />
      </svg>
    </div>
  );

  const renderSkeleton = () => (
    <div className="loading-skeleton">
      <div className="loading-skeleton__line loading-skeleton__line--title" />
      <div className="loading-skeleton__line loading-skeleton__line--text" />
      <div className="loading-skeleton__line loading-skeleton__line--text" />
      <div className="loading-skeleton__line loading-skeleton__line--short" />
    </div>
  );

  const renderProgress = () => (
    <div className="loading-progress">
      <div className="loading-progress__track">
        <div 
          className="loading-progress__fill"
          style={{ 
            width: `${Math.max(0, Math.min(100, progress || 0))}%`,
            backgroundColor: color 
          }}
        />
      </div>
      {typeof progress === 'number' && (
        <div className="loading-progress__text">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );

  const renderDots = () => (
    <div className="loading-dots" style={{ color }}>
      <div className="loading-dots__dot" />
      <div className="loading-dots__dot" />
      <div className="loading-dots__dot" />
    </div>
  );

  const renderPulse = () => (
    <div className="loading-pulse" style={{ backgroundColor: color }} />
  );

  const renderLoadingContent = () => {
    switch (variant) {
      case 'skeleton':
        return renderSkeleton();
      case 'progress':
        return renderProgress();
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={baseClasses} role="status" aria-live="polite">
      <div className="loading-state__content">
        {renderLoadingContent()}
        {message && (
          <div className="loading-state__message">
            {message}
          </div>
        )}
      </div>
      <span className="loading-state__sr-only">
        {message || 'Loading...'}
      </span>
    </div>
  );
};

// Specialized loading components
export const PageLoadingState: React.FC<Omit<LoadingStateProps, 'variant'>> = (props) => (
  <LoadingState 
    variant="spinner" 
    message="Loading page..." 
    {...props} 
  />
);

export const ImageLoadingState: React.FC<Omit<LoadingStateProps, 'variant'>> = (props) => (
  <LoadingState 
    variant="pulse" 
    message="Loading image..." 
    {...props} 
  />
);

export const ProcessingLoadingState: React.FC<Omit<LoadingStateProps, 'variant'> & { progress?: number }> = ({ progress, ...props }) => (
  <LoadingState 
    variant="progress" 
    message="Processing..." 
    progress={progress}
    {...props} 
  />
);

export const SkeletonLoadingState: React.FC<Omit<LoadingStateProps, 'variant'>> = (props) => (
  <LoadingState 
    variant="skeleton" 
    {...props} 
  />
);

// Loading overlay component
export interface LoadingOverlayProps extends LoadingStateProps {
  isVisible: boolean;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  children,
  ...loadingProps
}) => (
  <div className="loading-overlay-container">
    {children}
    {isVisible && (
      <LoadingState
        {...loadingProps}
        overlay
        fullScreen={false}
      />
    )}
  </div>
);