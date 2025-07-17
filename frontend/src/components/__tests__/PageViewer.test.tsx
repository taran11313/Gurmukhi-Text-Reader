import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PageViewer, PageViewerProps } from '../PageViewer';
import { ThemeProvider } from '../ThemeProvider';

// Mock component wrapper with theme provider
const PageViewerWithTheme: React.FC<PageViewerProps> = (props) => (
  <ThemeProvider>
    <PageViewer {...props} />
  </ThemeProvider>
);

// Default props for testing
const defaultProps: PageViewerProps = {
  pageNumber: 1,
  totalPages: 100,
  imageUrl: 'https://example.com/page1.jpg',
};

describe('PageViewer', () => {
  let mockOnPageChange: ReturnType<typeof vi.fn>;
  let mockOnImageLoad: ReturnType<typeof vi.fn>;
  let mockOnImageError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPageChange = vi.fn();
    mockOnImageLoad = vi.fn();
    mockOnImageError = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PageViewerWithTheme {...defaultProps} />);
      expect(screen.getByText('Page 1 of 100')).toBeInTheDocument();
    });

    it('displays correct page information', () => {
      render(
        <PageViewerWithTheme
          {...defaultProps}
          pageNumber={5}
          totalPages={50}
        />
      );
      expect(screen.getByText('Page 5 of 50')).toBeInTheDocument();
    });

    it('renders zoom controls', () => {
      render(<PageViewerWithTheme {...defaultProps} />);
      
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('renders image with correct attributes', () => {
      render(<PageViewerWithTheme {...defaultProps} />);
      
      const image = screen.getByAltText('Page 1 of 100');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/page1.jpg');
      expect(image).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially', () => {
      render(<PageViewerWithTheme {...defaultProps} />);
      expect(screen.getByText('Loading page 1...')).toBeInTheDocument();
    });

    it('shows loading spinner', () => {
      render(<PageViewerWithTheme {...defaultProps} />);
      expect(document.querySelector('.page-viewer__loading-spinner')).toBeInTheDocument();
    });

    it('hides image during loading', () => {
      render(<PageViewerWithTheme {...defaultProps} />);
      const image = screen.getByAltText('Page 1 of 100');
      expect(image).toHaveStyle({ display: 'none' });
    });
  });

  describe('Image Loading', () => {
    it('calls onImageLoad when image loads successfully', async () => {
      render(
        <PageViewerWithTheme
          {...defaultProps}
          onImageLoad={mockOnImageLoad}
        />
      );

      const image = screen.getByAltText('Page 1 of 100');
      fireEvent.load(image);

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalledTimes(1);
      });
    });

    it('shows image after successful load', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      const image = screen.getByAltText('Page 1 of 100');
      fireEvent.load(image);

      await waitFor(() => {
        expect(image).toHaveStyle({ display: 'block' });
        expect(image).toHaveClass('page-viewer__image--loaded');
      });
    });

    it('hides loading state after image loads', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      const image = screen.getByAltText('Page 1 of 100');
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.queryByText('Loading page 1...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error state when image fails to load', async () => {
      render(
        <PageViewerWithTheme
          {...defaultProps}
          onImageError={mockOnImageError}
        />
      );

      const image = screen.getByAltText('Page 1 of 100');
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText('Failed to load page 1')).toBeInTheDocument();
        expect(screen.getByText('There was an error loading this page. Please try again.')).toBeInTheDocument();
      });
    });

    it('calls onImageError when image fails to load', async () => {
      render(
        <PageViewerWithTheme
          {...defaultProps}
          onImageError={mockOnImageError}
        />
      );

      const image = screen.getByAltText('Page 1 of 100');
      fireEvent.error(image);

      await waitFor(() => {
        expect(mockOnImageError).toHaveBeenCalledTimes(1);
        expect(mockOnImageError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to load page 1'
          })
        );
      });
    });

    it('shows retry button in error state', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      const image = screen.getByAltText('Page 1 of 100');
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('retries loading when retry button is clicked', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      const image = screen.getByAltText('Page 1 of 100');
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Loading page 1...')).toBeInTheDocument();
      });
    });
  });

  describe('Zoom Functionality', () => {
    it('increases zoom level when zoom in button is clicked', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText('125%')).toBeInTheDocument();
      });
    });

    it('decreases zoom level when zoom out button is clicked', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      // First zoom in to have something to zoom out from
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText('125%')).toBeInTheDocument();
      });

      const zoomOutButton = screen.getByLabelText('Zoom out');
      fireEvent.click(zoomOutButton);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('resets zoom level when reset button is clicked', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      // First zoom in
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText('150%')).toBeInTheDocument();
      });

      const resetButton = screen.getByLabelText('Reset zoom');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('disables zoom out button at minimum zoom', () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      // Zoom out to minimum
      const zoomOutButton = screen.getByLabelText('Zoom out');
      fireEvent.click(zoomOutButton);
      fireEvent.click(zoomOutButton);

      expect(zoomOutButton).toBeDisabled();
    });

    it('disables zoom in button at maximum zoom', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      
      // Zoom in to maximum (3x = 300%)
      for (let i = 0; i < 8; i++) {
        fireEvent.click(zoomInButton);
      }

      await waitFor(() => {
        expect(zoomInButton).toBeDisabled();
      });
    });

    it('applies zoom transform to image', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      const image = screen.getByAltText('Page 1 of 100');
      const zoomInButton = screen.getByLabelText('Zoom in');
      
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(image).toHaveStyle({ transform: 'scale(1.25)' });
      });
    });
  });

  describe('Keyboard Zoom Shortcuts', () => {
    it('handles zoom keyboard shortcuts', () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      // Test that keyboard events don't throw errors
      expect(() => {
        fireEvent.keyDown(document, { key: '+' });
        fireEvent.keyDown(document, { key: '=' });
        fireEvent.keyDown(document, { key: '-' });
        fireEvent.keyDown(document, { key: '0' });
      }).not.toThrow();
    });

    it('zoom in with + key', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      fireEvent.keyDown(document, { key: '+' });

      await waitFor(() => {
        expect(screen.getByText('125%')).toBeInTheDocument();
      });
    });

    it('zoom in with = key', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      fireEvent.keyDown(document, { key: '=' });

      await waitFor(() => {
        expect(screen.getByText('125%')).toBeInTheDocument();
      });
    });

    it('zoom out with - key', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      // First zoom in to have something to zoom out from
      fireEvent.keyDown(document, { key: '+' });
      
      await waitFor(() => {
        expect(screen.getByText('125%')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: '-' });

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('reset zoom with 0 key', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      // First zoom in
      fireEvent.keyDown(document, { key: '+' });
      fireEvent.keyDown(document, { key: '+' });
      
      await waitFor(() => {
        expect(screen.getByText('150%')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: '0' });

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('zoom functionality works with button clicks', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      // Test zoom in button
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText(/125%/)).toBeInTheDocument();
      });

      // Test zoom out button
      const zoomOutButton = screen.getByLabelText('Zoom out');
      fireEvent.click(zoomOutButton);

      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument();
      });
    });

    it('zoom reset functionality works', async () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      // Zoom in twice
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText(/150%/)).toBeInTheDocument();
      });

      // Reset zoom
      const resetButton = screen.getByLabelText('Reset zoom');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument();
      });
    });
  });

  describe('State Management', () => {
    it('resets states when imageUrl changes', async () => {
      const { rerender } = render(<PageViewerWithTheme {...defaultProps} />);

      // Load the first image
      const image = screen.getByAltText('Page 1 of 100');
      fireEvent.load(image);

      await waitFor(() => {
        expect(image).toHaveClass('page-viewer__image--loaded');
      });

      // Change the image URL
      rerender(
        <PageViewerWithTheme
          {...defaultProps}
          imageUrl="https://example.com/page2.jpg"
          pageNumber={2}
        />
      );

      // Should show loading state again
      await waitFor(() => {
        expect(screen.getByText('Loading page 2...')).toBeInTheDocument();
      });
    });

    it('resets zoom when imageUrl changes', async () => {
      const { rerender } = render(<PageViewerWithTheme {...defaultProps} />);

      // Zoom in
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText('125%')).toBeInTheDocument();
      });

      // Change the image URL
      rerender(
        <PageViewerWithTheme
          {...defaultProps}
          imageUrl="https://example.com/page2.jpg"
          pageNumber={2}
        />
      );

      // Zoom should be reset
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for zoom controls', () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument();
    });

    it('has proper alt text for image', () => {
      render(<PageViewerWithTheme {...defaultProps} />);

      const image = screen.getByAltText('Page 1 of 100');
      expect(image).toBeInTheDocument();
    });

    it('maintains focus management for keyboard navigation', () => {
      render(
        <PageViewerWithTheme
          {...defaultProps}
          onPageChange={mockOnPageChange}
        />
      );

      // Focus should be manageable
      const zoomInButton = screen.getByLabelText('Zoom in');
      zoomInButton.focus();
      expect(document.activeElement).toBe(zoomInButton);
    });
  });
});