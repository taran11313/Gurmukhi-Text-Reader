import React from 'react';
import './ErrorMessage.css';

export type ErrorType = 
  | 'network'
  | 'image-load'
  | 'page-not-found'
  | 'validation'
  | 'session'
  | 'pdf-processing'
  | 'generic';

export interface ErrorMessageProps {
  type: ErrorType;
  message?: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  className?: string;
  showIcon?: boolean;
}

const ERROR_CONFIGS: Record<ErrorType, {
  title: string;
  defaultMessage: string;
  icon: string;
  color: string;
  suggestions: string[];
}> = {
  network: {
    title: 'Connection Problem',
    defaultMessage: 'Unable to connect to the server. Please check your internet connection.',
    icon: '🌐',
    color: '#FF6B6B',
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Wait a moment and try again'
    ]
  },
  'image-load': {
    title: 'Image Loading Failed',
    defaultMessage: 'The page image could not be loaded.',
    icon: '🖼️',
    color: '#FFA726',
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'The image may be temporarily unavailable'
    ]
  },
  'page-not-found': {
    title: 'Page Not Found',
    defaultMessage: 'The requested page could not be found.',
    icon: '📄',
    color: '#FF9800',
    suggestions: [
      'Check the page number is correct',
      'Try navigating to a different page',
      'Return to the first page'
    ]
  },
  validation: {
    title: 'Invalid Input',
    defaultMessage: 'Please check your input and try again.',
    icon: '⚠️',
    color: '#FF5722',
    suggestions: [
      'Check the format of your input',
      'Make sure all required fields are filled',
      'Follow the input guidelines'
    ]
  },
  session: {
    title: 'Session Error',
    defaultMessage: 'There was a problem with your reading session.',
    icon: '👤',
    color: '#9C27B0',
    suggestions: [
      'Try refreshing the page',
      'Your progress has been saved locally',
      'Contact support if the problem persists'
    ]
  },
  'pdf-processing': {
    title: 'PDF Processing Error',
    defaultMessage: 'There was a problem processing the PDF content.',
    icon: '📋',
    color: '#F44336',
    suggestions: [
      'The PDF may be temporarily unavailable',
      'Try again in a few moments',
      'Contact support if the problem persists'
    ]
  },
  generic: {
    title: 'Something Went Wrong',
    defaultMessage: 'An unexpected error occurred.',
    icon: '❌',
    color: '#757575',
    suggestions: [
      'Try refreshing the page',
      'Check your internet connection',
      'Contact support if the problem persists'
    ]
  }
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  type,
  message,
  details,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  className = '',
  showIcon = true,
}) => {
  const config = ERROR_CONFIGS[type];
  const displayMessage = message || config.defaultMessage;

  return (
    <div className={`error-message error-message--${type} ${className}`}>
      <div className="error-message__container">
        {showIcon && (
          <div className="error-message__icon" style={{ color: config.color }}>
            {config.icon}
          </div>
        )}
        
        <div className="error-message__content">
          <h3 className="error-message__title">{config.title}</h3>
          <p className="error-message__text">{displayMessage}</p>
          
          {details && (
            <details className="error-message__details">
              <summary className="error-message__details-summary">
                More Details
              </summary>
              <p className="error-message__details-text">{details}</p>
            </details>
          )}

          <div className="error-message__suggestions">
            <p className="error-message__suggestions-title">What you can try:</p>
            <ul className="error-message__suggestions-list">
              {config.suggestions.map((suggestion, index) => (
                <li key={index} className="error-message__suggestion">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="error-message__actions">
          {onRetry && (
            <button
              className="error-message__btn error-message__btn--retry"
              onClick={onRetry}
              style={{ backgroundColor: config.color }}
            >
              {retryLabel}
            </button>
          )}
          {onDismiss && (
            <button
              className="error-message__btn error-message__btn--dismiss"
              onClick={onDismiss}
              aria-label="Dismiss error message"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Specialized error message components for common use cases
export const NetworkError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage type="network" {...props} />
);

export const ImageLoadError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage type="image-load" {...props} />
);

export const PageNotFoundError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage type="page-not-found" {...props} />
);

export const ValidationError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage type="validation" {...props} />
);

export const SessionError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage type="session" {...props} />
);

export const PDFProcessingError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage type="pdf-processing" {...props} />
);