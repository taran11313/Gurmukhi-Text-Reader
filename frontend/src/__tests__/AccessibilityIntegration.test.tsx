import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import App from '../App';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';
import { PageViewer } from '../components/PageViewer';
import { NavigationControls } from '../components/NavigationControls';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock service worker registration
jest.mock('../utils/serviceWorker', () => ({
  registerServiceWorker: jest.fn(() => Promise.resolve(null)),
  preloadPages: jest.fn(),
}));

// Mock performance monitor
jest.mock('../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    trackNavigation: jest.fn(),
    trackImageLoad: jest.fn(),
    reportMetrics: jest.fn(),
  }),
}));

// Mock network status
jest.mock('../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));

// Mock session service
jest.mock('../services/sessionService', () => ({
  sessionService: {
    autoSaveSession: jest.fn(() => Promise.resolve()),
  },
}));

describe('Accessibility Integration Tests', () => {
  beforeEach(() => {
    // Reset any accessibility settings
    localStorage.clear();
  });

  describe('Keyboard Navigation', () => {
    test('should navigate pages using arrow keys', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 10000/)).toBeInTheDocument();
      });

      // Press right arrow to go to next page
      await user.keyboard('{ArrowRight}');
      
      await waitFor(() => {
        expect(screen.getByText(/Page 2 of 10000/)).toBeInTheDocument();
      });

      // Press left arrow to go back
      await user.keyboard('{ArrowLeft}');
      
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 10000/)).toBeInTheDocument();
      });
    });

    test('should navigate using Page Up/Down keys', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 10000/)).toBeInTheDocument();
      });

      // Press Page Down to go to next page
      await user.keyboard('{PageDown}');
      
      await waitFor(() => {
        expect(screen.getByText(/Page 2 of 10000/)).toBeInTheDocument();
      });

      // Press Page Up to go back
      await user.keyboard('{PageUp}');
      
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 10000/)).toBeInTheDocument();
      });
    });

    test('should navigate to first/last page using Home/End keys', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Navigate to page 5 first
      const pageInput = screen.getByLabelText(/Jump to page number/);
      await user.clear(pageInput);
      await user.type(pageInput, '5');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Page 5 of 10000/)).toBeInTheDocument();
      });

      // Press Home to go to first page
      await user.keyboard('{Home}');
      
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 10000/)).toBeInTheDocument();
      });

      // Press End to go to last page
      await user.keyboard('{End}');
      
      await waitFor(() => {
        expect(screen.getByText(/Page 10000 of 10000/)).toBeInTheDocument();
      });
    });

    test('should handle zoom keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument();
      });

      // Press + to zoom in
      await user.keyboard('{+}');
      
      await waitFor(() => {
        expect(screen.getByText(/125%/)).toBeInTheDocument();
      });

      // Press - to zoom out
      await user.keyboard('{-}');
      
      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument();
      });

      // Zoom in again and reset with 0
      await user.keyboard('{+}');
      await user.keyboard('{0}');
      
      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument();
      });
    });
  });

  describe('Screen Reader Support', () => {
    test('should have proper ARIA labels and roles', () => {
      render(<App />);

      // Check main navigation
      expect(screen.getByRole('navigation', { name: /page navigation/i })).toBeInTheDocument();
      
      // Check main content area
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check page viewer
      expect(screen.getByRole('main', { name: /page viewer/i })).toBeInTheDocument();
      
      // Check progress bar
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Check navigation buttons
      expect(screen.getByRole('button', { name: /go to first page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to last page/i })).toBeInTheDocument();
    });

    test('should have proper form labels and descriptions', () => {
      render(<App />);

      const pageInput = screen.getByLabelText(/Jump to page number/);
      expect(pageInput).toBeInTheDocument();
      expect(pageInput).toHaveAttribute('aria-describedby');
      
      // Check that the input has proper ARIA attributes
      expect(pageInput).toHaveAttribute('aria-invalid', 'false');
      expect(pageInput).toHaveAttribute('min', '1');
      expect(pageInput).toHaveAttribute('max', '10000');
    });

    test('should announce page changes to screen readers', async () => {
      const user = userEvent.setup();
      
      // Mock the screen reader announcement
      const mockAnnounce = jest.fn();
      
      render(
        <AccessibilityProvider>
          <NavigationControls
            currentPage={1}
            totalPages={100}
            onPageChange={() => {}}
          />
        </AccessibilityProvider>
      );

      // This would be tested with actual screen reader testing tools
      // For now, we verify the structure is in place
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('should have live regions for dynamic content', () => {
      render(<App />);

      // Check for live regions (they might be visually hidden)
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });
  });

  describe('Focus Management', () => {
    test('should have visible focus indicators', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Tab to first focusable element
      await user.tab();
      
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
      
      // Check that focus is visible (this would need visual regression testing)
      // For now, we verify the element can receive focus
      expect(focusedElement).toHaveAttribute('tabindex', '0');
    });

    test('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Tab through elements and verify order
      await user.tab(); // Skip link
      expect(document.activeElement).toHaveClass('skip-link');
      
      await user.tab(); // Next skip link
      expect(document.activeElement).toHaveClass('skip-link');
      
      await user.tab(); // First navigation button
      expect(document.activeElement).toHaveAttribute('aria-label', expect.stringContaining('first page'));
    });

    test('should handle skip links correctly', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Focus on skip link
      const skipLink = screen.getByText('Skip to main content');
      await user.click(skipLink);
      
      // Verify it navigates to main content
      expect(document.activeElement?.id).toBe('main-content');
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('should meet WCAG color contrast requirements', () => {
      render(<App />);

      // This would typically be tested with automated tools
      // We can verify the CSS custom properties are set correctly
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      
      expect(styles.getPropertyValue('--color-dark-brown')).toBe('#3C2415');
      expect(styles.getPropertyValue('--color-cream')).toBe('#FAF7F0');
    });

    test('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<App />);
      
      // Verify high contrast class is applied
      expect(document.documentElement).toHaveClass('high-contrast');
    });

    test('should support reduced motion preferences', () => {
      // Mock reduced motion media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<App />);
      
      // Verify reduced motion class is applied
      expect(document.documentElement).toHaveClass('reduced-motion');
    });
  });

  describe('Error Handling and User Feedback', () => {
    test('should provide accessible error messages', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Enter invalid page number
      const pageInput = screen.getByLabelText(/Jump to page number/);
      await user.clear(pageInput);
      await user.type(pageInput, '99999');
      await user.keyboard('{Enter}');

      // Check for error message with proper ARIA attributes
      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent(/cannot exceed/i);
      });

      // Verify input is marked as invalid
      expect(pageInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('should handle loading states accessibly', () => {
      render(
        <PageViewer
          pageNumber={1}
          totalPages={100}
          imageUrl="test-url"
        />
      );

      // Check for loading state with proper ARIA
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Mobile Accessibility', () => {
    test('should have appropriate touch targets', () => {
      render(<App />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = getComputedStyle(button);
        // Verify minimum touch target size (44px)
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
        expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44);
      });
    });

    test('should provide touch navigation instructions', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<App />);

      // Check for mobile-specific instructions
      expect(screen.getByText(/swipe left\/right/i)).toBeInTheDocument();
    });
  });

  describe('Automated Accessibility Testing', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(<App />);
      
      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText(/Punjabi Religious Reader/)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should pass accessibility audit for navigation component', async () => {
      const { container } = render(
        <NavigationControls
          currentPage={5}
          totalPages={100}
          onPageChange={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should pass accessibility audit for page viewer component', async () => {
      const { container } = render(
        <PageViewer
          pageNumber={1}
          totalPages={100}
          imageUrl="https://example.com/image.jpg"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});