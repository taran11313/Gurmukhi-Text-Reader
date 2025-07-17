import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { 
  ErrorMessage, 
  NetworkError, 
  ImageLoadError, 
  PageNotFoundError, 
  ValidationError, 
  SessionError, 
  PDFProcessingError 
} from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('renders basic error message', () => {
    render(
      <ErrorMessage 
        type="generic" 
        message="Something went wrong" 
      />
    );

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('uses default message when none provided', () => {
    render(<ErrorMessage type="network" />);

    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to the server. Please check your internet connection.')).toBeInTheDocument();
  });

  it('shows error icon when enabled', () => {
    render(<ErrorMessage type="network" showIcon={true} />);

    expect(screen.getByText('🌐')).toBeInTheDocument();
  });

  it('hides error icon when disabled', () => {
    render(<ErrorMessage type="network" showIcon={false} />);

    expect(screen.queryByText('🌐')).not.toBeInTheDocument();
  });

  it('shows additional details when provided', () => {
    render(
      <ErrorMessage 
        type="generic" 
        details="Detailed error information" 
      />
    );

    const detailsButton = screen.getByText('More Details');
    fireEvent.click(detailsButton);

    expect(screen.getByText('Detailed error information')).toBeInTheDocument();
  });

  it('shows suggestions for the error type', () => {
    render(<ErrorMessage type="network" />);

    expect(screen.getByText('What you can try:')).toBeInTheDocument();
    expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
    expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();

    render(
      <ErrorMessage 
        type="generic" 
        onRetry={onRetry}
        retryLabel="Try Again"
      />
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalled();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();

    render(
      <ErrorMessage 
        type="generic" 
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByLabelText('Dismiss error message');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ErrorMessage 
        type="generic" 
        className="custom-error"
      />
    );

    expect(container.firstChild).toHaveClass('custom-error');
  });

  it('shows correct styling for different error types', () => {
    const { container } = render(<ErrorMessage type="network" />);

    expect(container.firstChild).toHaveClass('error-message--network');
  });
});

describe('Specialized Error Components', () => {
  it('renders NetworkError with correct type', () => {
    render(<NetworkError message="Network is down" />);

    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText('Network is down')).toBeInTheDocument();
  });

  it('renders ImageLoadError with correct type', () => {
    render(<ImageLoadError message="Image failed to load" />);

    expect(screen.getByText('Image Loading Failed')).toBeInTheDocument();
    expect(screen.getByText('Image failed to load')).toBeInTheDocument();
  });

  it('renders PageNotFoundError with correct type', () => {
    render(<PageNotFoundError message="Page does not exist" />);

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText('Page does not exist')).toBeInTheDocument();
  });

  it('renders ValidationError with correct type', () => {
    render(<ValidationError message="Invalid input provided" />);

    expect(screen.getByText('Invalid Input')).toBeInTheDocument();
    expect(screen.getByText('Invalid input provided')).toBeInTheDocument();
  });

  it('renders SessionError with correct type', () => {
    render(<SessionError message="Session expired" />);

    expect(screen.getByText('Session Error')).toBeInTheDocument();
    expect(screen.getByText('Session expired')).toBeInTheDocument();
  });

  it('renders PDFProcessingError with correct type', () => {
    render(<PDFProcessingError message="PDF could not be processed" />);

    expect(screen.getByText('PDF Processing Error')).toBeInTheDocument();
    expect(screen.getByText('PDF could not be processed')).toBeInTheDocument();
  });

  it('passes through additional props to specialized components', () => {
    const onRetry = vi.fn();

    render(
      <NetworkError 
        message="Custom network error" 
        onRetry={onRetry}
        retryLabel="Reconnect"
      />
    );

    const retryButton = screen.getByText('Reconnect');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalled();
  });
});