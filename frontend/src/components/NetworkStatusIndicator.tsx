import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import './NetworkStatusIndicator.css';

export interface NetworkStatusIndicatorProps {
  showWhenOnline?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showWhenOnline = false,
  position = 'top-right',
  className = '',
}) => {
  const { isOnline, isSlowConnection, effectiveType, checkConnection } = useNetworkStatus();
  const [isVisible, setIsVisible] = React.useState(!isOnline);

  React.useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
    } else if (showWhenOnline) {
      setIsVisible(true);
      // Hide after a few seconds when coming back online
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOnline, showWhenOnline]);

  const handleRetryConnection = async () => {
    await checkConnection();
  };

  if (!isVisible) return null;

  const getStatusText = () => {
    if (!isOnline) return 'No internet connection';
    if (isSlowConnection) return `Slow connection (${effectiveType})`;
    return 'Connected';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '📡';
    if (isSlowConnection) return '🐌';
    return '✅';
  };

  const indicatorClasses = [
    'network-status-indicator',
    `network-status-indicator--${position}`,
    `network-status-indicator--${isOnline ? 'online' : 'offline'}`,
    isSlowConnection && 'network-status-indicator--slow',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={indicatorClasses} role="status" aria-live="polite">
      <div className="network-status-indicator__content">
        <span className="network-status-indicator__icon">
          {getStatusIcon()}
        </span>
        <span className="network-status-indicator__text">
          {getStatusText()}
        </span>
        {!isOnline && (
          <button
            className="network-status-indicator__retry"
            onClick={handleRetryConnection}
            aria-label="Check connection"
            title="Check connection"
          >
            🔄
          </button>
        )}
      </div>
    </div>
  );
};

// Offline banner component for more prominent offline indication
export interface OfflineBannerProps {
  onRetry?: () => void;
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  onRetry,
  className = '',
}) => {
  const { isOnline, checkConnection } = useNetworkStatus();
  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => {
    if (isOnline) {
      setIsDismissed(false);
    }
  }, [isOnline]);

  const handleRetry = async () => {
    await checkConnection();
    onRetry?.();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (isOnline || isDismissed) return null;

  return (
    <div className={`offline-banner ${className}`} role="alert">
      <div className="offline-banner__content">
        <div className="offline-banner__icon">📡</div>
        <div className="offline-banner__message">
          <h3 className="offline-banner__title">You're offline</h3>
          <p className="offline-banner__text">
            Some features may not work properly. Check your internet connection.
          </p>
        </div>
        <div className="offline-banner__actions">
          <button
            className="offline-banner__btn offline-banner__btn--retry"
            onClick={handleRetry}
          >
            Try Again
          </button>
          <button
            className="offline-banner__btn offline-banner__btn--dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss offline notification"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};