import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResponsiveLayout } from '../ResponsiveLayout';

// Mock window.innerWidth and window.innerHeight
const mockWindowSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: touches,
    writable: false,
  });
  Object.defineProperty(event, 'changedTouches', {
    value: touches,
    writable: false,
  });
  return event;
};

describe('ResponsiveLayout', () => {
  const mockOnPageChange = vi.fn();
  const defaultProps = {
    currentPage: 5,
    totalPages: 100,
    onPageChange: mockOnPageChange,
    children: <div data-testid="test-content">Test Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default window size
    mockWindowSize(1024, 768);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders children content', () => {
      render(<ResponsiveLayout {...defaultProps} />);
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      render(<ResponsiveLayout {...defaultProps} className="custom-class" />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');
      expect(container).toHaveClass('custom-class');
    });

    it('shows debug info in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(<ResponsiveLayout {...defaultProps} />);
      expect(screen.getByText(/1024×768 - Desktop/)).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('hides debug info in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(<ResponsiveLayout {...defaultProps} />);
      expect(screen.queryByText(/1024×768/)).not.toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Screen Size Detection', () => {
    it('detects mobile screen size correctly', () => {
      mockWindowSize(375, 667);
      render(<ResponsiveLayout {...defaultProps} />);
      
      const container = screen.getByTestId('test-content').closest('.responsive-layout');
      expect(container).toHaveClass('responsive-layout--mobile');
      expect(container).toHaveAttribute('data-screen-size', 'mobile');
    });

    it('detects tablet screen size correctly', () => {
      mockWindowSize(768, 1024);
      render(<ResponsiveLayout {...defaultProps} />);
      
      const container = screen.getByTestId('test-content').closest('.responsive-layout');
      expect(container).toHaveClass('responsive-layout--tablet');
      expect(container).toHaveAttribute('data-screen-size', 'tablet');
    });

    it('detects desktop screen size correctly', () => {
      mockWindowSize(1440, 900);
      render(<ResponsiveLayout {...defaultProps} />);
      
      const container = screen.getByTestId('test-content').closest('.responsive-layout');
      expect(container).toHaveClass('responsive-layout--desktop');
      expect(container).toHaveAttribute('data-screen-size', 'desktop');
    });

    it('updates screen size on window resize', async () => {
      mockWindowSize(375, 667);
      render(<ResponsiveLayout {...defaultProps} />);
      
      let container = screen.getByTestId('test-content').closest('.responsive-layout');
      expect(container).toHaveClass('responsive-layout--mobile');

      // Simulate window resize
      mockWindowSize(1024, 768);
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        container = screen.getByTestId('test-content').closest('.responsive-layout');
        expect(container).toHaveClass('responsive-layout--desktop');
      });
    });
  });

  describe('Touch Gesture Support', () => {
    beforeEach(() => {
      mockWindowSize(375, 667); // Mobile size
    });

    it('shows gesture hint on mobile', () => {
      render(<ResponsiveLayout {...defaultProps} />);
      expect(screen.getByText('Swipe left/right to navigate pages')).toBeInTheDocument();
    });

    it('handles swipe right to go to previous page', async () => {
      render(<ResponsiveLayout {...defaultProps} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');

      // Simulate swipe right (previous page)
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 200, clientY: 200 }]);

      fireEvent(container!, touchStart);
      
      // Wait a bit to simulate realistic touch timing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      fireEvent(container!, touchEnd);

      expect(mockOnPageChange).toHaveBeenCalledWith(4); // Previous page
    });

    it('handles swipe left to go to next page', async () => {
      render(<ResponsiveLayout {...defaultProps} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');

      // Simulate swipe left (next page)
      const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 200 }]);

      fireEvent(container!, touchStart);
      
      // Wait a bit to simulate realistic touch timing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      fireEvent(container!, touchEnd);

      expect(mockOnPageChange).toHaveBeenCalledWith(6); // Next page
    });

    it('does not navigate when on first page and swiping right', async () => {
      const props = { ...defaultProps, currentPage: 1 };
      render(<ResponsiveLayout {...props} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');

      // Simulate swipe right on first page
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 200, clientY: 200 }]);

      fireEvent(container!, touchStart);
      await new Promise(resolve => setTimeout(resolve, 50));
      fireEvent(container!, touchEnd);

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('does not navigate when on last page and swiping left', async () => {
      const props = { ...defaultProps, currentPage: 100 };
      render(<ResponsiveLayout {...props} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');

      // Simulate swipe left on last page
      const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 200 }]);

      fireEvent(container!, touchStart);
      await new Promise(resolve => setTimeout(resolve, 50));
      fireEvent(container!, touchEnd);

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('ignores vertical swipes', async () => {
      render(<ResponsiveLayout {...defaultProps} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');

      // Simulate vertical swipe
      const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 200, clientY: 200 }]);

      fireEvent(container!, touchStart);
      await new Promise(resolve => setTimeout(resolve, 50));
      fireEvent(container!, touchEnd);

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('ignores short swipes', async () => {
      render(<ResponsiveLayout {...defaultProps} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');

      // Simulate short swipe (less than minimum distance)
      const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 220, clientY: 200 }]);

      fireEvent(container!, touchStart);
      await new Promise(resolve => setTimeout(resolve, 50));
      fireEvent(container!, touchEnd);

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('does not handle touch gestures on non-mobile devices', async () => {
      mockWindowSize(1024, 768); // Desktop size
      render(<ResponsiveLayout {...defaultProps} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');

      // Simulate swipe on desktop
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 200, clientY: 200 }]);

      fireEvent(container!, touchStart);
      await new Promise(resolve => setTimeout(resolve, 50));
      fireEvent(container!, touchEnd);

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('hides gesture hint on tablet and desktop', () => {
      mockWindowSize(1024, 768); // Desktop size
      render(<ResponsiveLayout {...defaultProps} />);
      expect(screen.queryByText('Swipe left/right to navigate pages')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper CSS class for touch handling', () => {
      render(<ResponsiveLayout {...defaultProps} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');
      expect(container).toHaveClass('responsive-layout');
    });

    it('provides proper container structure', () => {
      render(<ResponsiveLayout {...defaultProps} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');
      const content = container?.querySelector('.responsive-layout__content');
      expect(content).toBeInTheDocument();
      expect(content).toContainElement(screen.getByTestId('test-content'));
    });
  });

  describe('Edge Cases', () => {
    it('handles missing onPageChange prop gracefully', () => {
      const props = { ...defaultProps };
      delete props.onPageChange;
      
      expect(() => render(<ResponsiveLayout {...props} />)).not.toThrow();
    });

    it('handles touch events without onPageChange prop', async () => {
      mockWindowSize(375, 667); // Mobile size
      const props = { ...defaultProps };
      delete props.onPageChange;
      
      render(<ResponsiveLayout {...props} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');

      // Should not throw error
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 200, clientY: 200 }]);

      expect(() => {
        fireEvent(container!, touchStart);
        fireEvent(container!, touchEnd);
      }).not.toThrow();
    });

    it('handles rapid touch events correctly', async () => {
      mockWindowSize(375, 667); // Mobile size
      render(<ResponsiveLayout {...defaultProps} />);
      const container = screen.getByTestId('test-content').closest('.responsive-layout');

      // Simulate rapid touch events
      const touchStart1 = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
      const touchEnd1 = createTouchEvent('touchend', [{ clientX: 200, clientY: 200 }]);
      const touchStart2 = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
      const touchEnd2 = createTouchEvent('touchend', [{ clientX: 100, clientY: 200 }]);

      fireEvent(container!, touchStart1);
      fireEvent(container!, touchEnd1);
      fireEvent(container!, touchStart2);
      fireEvent(container!, touchEnd2);

      // Should handle both gestures
      expect(mockOnPageChange).toHaveBeenCalledTimes(2);
    });
  });
});