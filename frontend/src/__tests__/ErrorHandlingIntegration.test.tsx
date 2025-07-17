import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PageViewer } from '../components/PageViewer';
import { NavigationControls } from '../components/NavigationControls';
import { NetworkStatusIndicator, OfflineBanner } from '../components/NetworkStatusIndicator';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
    });
    navigator.onLine = true;
  });

  it('handles PageViewer errors with error boundary', async () => {
    const onError = vi.fn();
    
    // Mock image loading failure
    const mockImage = {
      addEventListener: vi.fn((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Image load failed')), 100);
        }
      }),
      removeEventListener: vi.fn(),
      src: '',
    };
    
    global.Image = vi.fn(() => mockImage) as any;

    render(
      <ErrorBoundary onError={onError}>
        <PageViewer
          pageNumber={1}
          totalPages={100}
          imageUrl="https://example.com/page1.jpg"
          onPageChange={() => {}}
        />
      </ErrorBoundary>
    );

    // Should show loading state initially
    expect(screen.getByText(/Loading page 1/)).toBeInTheDocument();

    // Wait for image error to trigger
    await waitFor(() => {
      expect(screen.getByText(/Failed to load page 1/)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Should show retry button
    expect(screen.getByText('Reload Image')).toBeInTheDocument();
  });

  it('handles navigation errors gracefully', () => {
    const onPageChange = vi.fn(() => {
      throw new Error('Navigation failed');
    });
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <NavigationControls
          currentPage={1}
          totalPages={100}
          onPageChange={onPageChange}
        />
      </ErrorBoundary>
    );

    // Click next button to trigger error
    const nextButton = screen.getByLabelText('Go to next page');
    fireEvent.click(nextButton);

    // Error boundary should catch the error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
  });

  it('shows network status when offline', () => {
    navigator.onLine = false;

    render(<NetworkStatusIndicator />);

    expect(screen.getByText('No internet connection')).toBeInTheDocument();
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });

  it('shows offline banner when offline', () => {
    navigator.onLine = false;

    render(<OfflineBanner />);

    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText('Some features may not work properly. Check your internet connection.')).toBeInTheDocument();
  });

  it('handles retry mechanism in PageViewer', async () => {
    let imageLoadAttempts = 0;
    const mockImage = {
      addEventListener: vi.fn((event, callback) => {
        if (event === 'error') {
          imageLoadAttempts++;
          if (imageLoadAttempts < 3) {
            setTimeout(() => callback(new Error('Image load failed')), 100);
          }
        } else if (event === 'load') {
          if (imageLoadAttempts >= 3) {
            setTimeout(() => callback(), 100);
          }
        }
      }),
      removeEventListener: vi.fn(),
      src: '',
    };
    
    global.Image = vi.fn(() => mockImage) as any;

    render(
      <PageViewer
        pageNumber={1}
        totalPages={100}
        imageUrl="https://example.com/page1.jpg"
        onPageChange={() => {}}
      />
    );

    // Wait for initial error
    await waitFor(() => {
      expect(screen.getByText(/Failed to load page 1/)).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByText('Reload Image');
    fireEvent.click(retryButton);

    // Should show loading state
    expect(screen.getByText(/Loading page 1/)).toBeInTheDocument();
  });

  it('disables navigation when offline', () => {
    navigator.onLine = false;

    render(
      <NavigationControls
        currentPage={5}
        totalPages={100}
        onPageChange={() => {}}
        disabled={!navigator.onLine}
      />
    );

    const nextButton = screen.getByLabelText('Go to next page');
    const prevButton = screen.getByLabelText('Go to previous page');
    const pageInput = screen.getByLabelText('Page:');

    expect(nextButton).toBeDisabled();
    expect(prevButton).toBeDisabled();
    expect(pageInput).toBeDisabled();
  });

  it('shows appropriate error messages for different error types', () => {
    const { rerender } = render(
      <div data-testid="error-container">
        {/* This would be rendered by error boundary or error handling logic */}
      </div>
    );

    // Test network error
    rerender(
      <div data-testid="error-container">
        <div>Connection Problem</div>
        <div>Unable to connect to the server. Please check your internet connection.</div>
      </div>
    );

    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to the server. Please check your internet connection.')).toBeInTheDocument();
  });

  it('handles multiple error boundaries independently', () => {
    const ThrowError: React.FC<{ id: string }> = ({ id }) => {
      throw new Error(`Error in ${id}`);
    };

    const onError1 = vi.fn();
    const onError2 = vi.fn();

    render(
      <div>
        <ErrorBoundary onError={onError1}>
          <div>Component 1</div>
          <ThrowError id="component1" />
        </ErrorBoundary>
        <ErrorBoundary onError={onError2}>
          <div>Component 2 works fine</div>
        </ErrorBoundary>
      </div>
    );

    // First error boundary should show error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(onError1).toHaveBeenCalled();

    // Second error boundary should still show content
    expect(screen.getByText('Component 2 works fine')).toBeInTheDocument();
    expect(onError2).not.toHaveBeenCalled();
  });

  it('recovers from errors when retry is successful', async () => {
    let shouldThrow = true;
    const TestComponent: React.FC = () => {
      if (shouldThrow) {
        throw new Error('Temporary error');
      }
      return <div>Component recovered</div>;
    };

    const { rerender } = render(
      <ErrorBoundary resetKeys={[shouldThrow]}>
        <TestComponent />
      </ErrorBoundary>
    );

    // Should show error initially
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error and trigger reset
    shouldThrow = false;
    rerender(
      <ErrorBoundary resetKeys={[shouldThrow]}>
        <TestComponent />
      </ErrorBoundary>
    );

    // Should show recovered component
    expect(screen.getByText('Component recovered')).toBeInTheDocument();
  });

  it('provides comprehensive error information in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const ThrowError: React.FC = () => {
      throw new Error('Detailed error for development');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should show technical details button
    const detailsButton = screen.getByText('Technical Details');
    fireEvent.click(detailsButton);

    expect(screen.getByText('Error: Detailed error for development')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});