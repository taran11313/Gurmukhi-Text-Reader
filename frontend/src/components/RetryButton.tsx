import React from 'react';
import { LoadingState } from './LoadingState';
import './RetryButton.css';

export interface RetryButtonProps {
  onRetry: () => void | Promise<void>;
  isRetrying?: boolean;
  disabled?: boolean;
  attemptCount?: number;
  maxAttempts?: number;
  lastError?: Error | null;
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  showAttemptCount?: boolean;
  retryDelay?: number;
  className?: string;
  children?: React.ReactNode;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  isRetrying = false,
  disabled = false,
  attemptCount = 0,
  maxAttempts = 3,
  lastError,
  variant = 'primary',
  size = 'medium',
  showAttemptCount = true,
  retryDelay,
  className = '',
  children,
}) => {
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const countdownRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (retryDelay && retryDelay > 0 && !isRetrying && lastError) {
      setCountdown(Math.ceil(retryDelay / 1000));
      
      const startTime = Date.now();
      const updateCountdown = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.ceil((retryDelay - elapsed) / 1000);
        
        if (remaining <= 0) {
          setCountdown(null);
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
        } else {
          setCountdown(remaining);
        }
      };

      countdownRef.current = window.setInterval(updateCountdown, 100);
      
      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setCountdown(null);
      };
    }
  }, [retryDelay, isRetrying, lastError]);

  const handleRetry = async () => {
    if (disabled || isRetrying || countdown !== null) return;
    
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const isDisabled = disabled || isRetrying || countdown !== null || attemptCount >= maxAttempts;
  const showCountdown = countdown !== null && countdown > 0;

  const buttonClasses = [
    'retry-button',
    `retry-button--${variant}`,
    `retry-button--${size}`,
    isDisabled && 'retry-button--disabled',
    isRetrying && 'retry-button--retrying',
    className
  ].filter(Boolean).join(' ');

  const getButtonText = () => {
    if (children) return children;
    
    if (showCountdown) {
      return `Retry in ${countdown}s`;
    }
    
    if (isRetrying) {
      return 'Retrying...';
    }
    
    if (attemptCount >= maxAttempts) {
      return 'Max attempts reached';
    }
    
    return attemptCount > 0 ? 'Try Again' : 'Retry';
  };

  const getAriaLabel = () => {
    if (showCountdown) {
      return `Retry in ${countdown} seconds`;
    }
    
    if (isRetrying) {
      return 'Retrying operation';
    }
    
    if (attemptCount >= maxAttempts) {
      return 'Maximum retry attempts reached';
    }
    
    const attemptText = showAttemptCount && attemptCount > 0 
      ? ` (attempt ${attemptCount + 1} of ${maxAttempts})`
      : '';
    
    return `Retry operation${attemptText}`;
  };

  return (
    <div className="retry-button-container">
      <button
        className={buttonClasses}
        onClick={handleRetry}
        disabled={isDisabled}
        aria-label={getAriaLabel()}
        type="button"
      >
        {isRetrying ? (
          <div className="retry-button__loading">
            <LoadingState
              variant="dots"
              size="small"
              color="currentColor"
            />
            <span className="retry-button__text">
              {getButtonText()}
            </span>
          </div>
        ) : (
          <span className="retry-button__text">
            {getButtonText()}
          </span>
        )}
      </button>
      
      {showAttemptCount && attemptCount > 0 && attemptCount < maxAttempts && (
        <div className="retry-button__attempt-info">
          Attempt {attemptCount} of {maxAttempts}
        </div>
      )}
      
      {lastError && (
        <div className="retry-button__error-hint">
          {lastError.message.length > 50 
            ? `${lastError.message.substring(0, 50)}...`
            : lastError.message
          }
        </div>
      )}
    </div>
  );
};

// Specialized retry button components
export const ImageRetryButton: React.FC<Omit<RetryButtonProps, 'variant'>> = (props) => (
  <RetryButton variant="secondary" {...props}>
    Reload Image
  </RetryButton>
);

export const PageRetryButton: React.FC<Omit<RetryButtonProps, 'variant'>> = (props) => (
  <RetryButton variant="primary" {...props}>
    Reload Page
  </RetryButton>
);

export const NetworkRetryButton: React.FC<Omit<RetryButtonProps, 'variant'>> = (props) => (
  <RetryButton variant="primary" {...props}>
    Reconnect
  </RetryButton>
);