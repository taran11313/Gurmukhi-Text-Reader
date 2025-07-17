import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  LoadingState, 
  PageLoadingState, 
  ImageLoadingState, 
  ProcessingLoadingState, 
  SkeletonLoadingState,
  LoadingOverlay 
} from '../LoadingState';

describe('LoadingState', () => {
  it('renders spinner variant by default', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingState message="Please wait..." />);

    const messages = screen.getAllByText('Please wait...');
    expect(messages).toHaveLength(2); // One visible, one for screen readers
  });

  it('renders skeleton variant', () => {
    const { container } = render(<LoadingState variant="skeleton" />);

    expect(container.querySelector('.loading-skeleton')).toBeInTheDocument();
  });

  it('renders progress variant with progress value', () => {
    const { container } = render(<LoadingState variant="progress" progress={75} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(container.querySelector('.loading-progress')).toBeInTheDocument();
  });

  it('renders dots variant', () => {
    const { container } = render(<LoadingState variant="dots" />);

    expect(container.querySelector('.loading-dots')).toBeInTheDocument();
  });

  it('renders pulse variant', () => {
    const { container } = render(<LoadingState variant="pulse" />);

    expect(container.querySelector('.loading-pulse')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { container } = render(<LoadingState size="large" />);

    expect(container.firstChild).toHaveClass('loading-state--large');
  });

  it('applies fullscreen class when enabled', () => {
    const { container } = render(<LoadingState fullScreen={true} />);

    expect(container.firstChild).toHaveClass('loading-state--fullscreen');
  });

  it('applies overlay class when enabled', () => {
    const { container } = render(<LoadingState overlay={true} />);

    expect(container.firstChild).toHaveClass('loading-state--overlay');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingState className="custom-loading" />);

    expect(container.firstChild).toHaveClass('custom-loading');
  });

  it('applies custom color', () => {
    const { container } = render(<LoadingState color="#FF0000" />);

    const spinner = container.querySelector('.loading-spinner');
    expect(spinner).toHaveStyle('color: #FF0000');
  });

  it('handles progress values correctly', () => {
    // Test normal progress
    const { rerender } = render(<LoadingState variant="progress" progress={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Test progress over 100 - should show actual value, not clamped
    rerender(<LoadingState variant="progress" progress={150} />);
    expect(screen.getByText('150%')).toBeInTheDocument();

    // Test negative progress - should show actual value, not clamped
    rerender(<LoadingState variant="progress" progress={-10} />);
    expect(screen.getByText('-10%')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingState message="Loading content" />);

    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
    const messages = screen.getAllByText('Loading content');
    expect(messages).toHaveLength(2); // One visible, one for screen readers
  });
});

describe('Specialized Loading Components', () => {
  it('renders PageLoadingState with correct defaults', () => {
    render(<PageLoadingState />);

    const messages = screen.getAllByText('Loading page...');
    expect(messages).toHaveLength(2); // One visible, one for screen readers
  });

  it('renders ImageLoadingState with correct defaults', () => {
    render(<ImageLoadingState />);

    const messages = screen.getAllByText('Loading image...');
    expect(messages).toHaveLength(2); // One visible, one for screen readers
  });

  it('renders ProcessingLoadingState with progress', () => {
    render(<ProcessingLoadingState progress={60} />);

    const messages = screen.getAllByText('Processing...');
    expect(messages).toHaveLength(2); // One visible, one for screen readers
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders SkeletonLoadingState with skeleton variant', () => {
    const { container } = render(<SkeletonLoadingState />);

    expect(container.querySelector('.loading-skeleton')).toBeInTheDocument();
  });

  it('passes through additional props to specialized components', () => {
    render(<PageLoadingState size="large" className="custom-page-loading" />);

    const element = screen.getByRole('status');
    expect(element).toHaveClass('loading-state--large');
    expect(element).toHaveClass('custom-page-loading');
  });
});

describe('LoadingOverlay', () => {
  it('renders children when not visible', () => {
    render(
      <LoadingOverlay isVisible={false}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders children and loading overlay when visible', () => {
    render(
      <LoadingOverlay isVisible={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('passes loading props to overlay', () => {
    render(
      <LoadingOverlay 
        isVisible={true} 
        variant="dots" 
        message="Processing..."
      >
        <div>Content</div>
      </LoadingOverlay>
    );

    const messages = screen.getAllByText('Processing...');
    expect(messages).toHaveLength(2); // One visible, one for screen readers
  });

  it('has correct container structure', () => {
    const { container } = render(
      <LoadingOverlay isVisible={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(container.querySelector('.loading-overlay-container')).toBeInTheDocument();
  });
});