import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AccessibilityProvider,
  useAccessibility,
  useKeyboardNavigation,
  useFocusManagement,
} from '../AccessibilityContext';

// Test component to use the accessibility context
const TestComponent: React.FC = () => {
  const {
    settings,
    updateSetting,
    announceToScreenReader,
    isKeyboardUser,
    colorContrastResults,
  } = useAccessibility();

  return (
    <div>
      <div data-testid="high-contrast">{settings.highContrast.toString()}</div>
      <div data-testid="reduced-motion">{settings.reducedMotion.toString()}</div>
      <div data-testid="large-text">{settings.largeText.toString()}</div>
      <div data-testid="keyboard-user">{isKeyboardUser.toString()}</div>
      <div data-testid="contrast-results">{JSON.stringify(colorContrastResults.textOnBackground)}</div>
      
      <button onClick={() => updateSetting('highContrast', !settings.highContrast)}>
        Toggle High Contrast
      </button>
      <button onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}>
        Toggle Reduced Motion
      </button>
      <button onClick={() => updateSetting('largeText', !settings.largeText)}>
        Toggle Large Text
      </button>
      <button onClick={() => announceToScreenReader('Test announcement')}>
        Announce
      </button>
    </div>
  );
};

// Test component for keyboard navigation hook
const KeyboardNavigationTest: React.FC = () => {
  const [direction, setDirection] = React.useState<string>('');
  
  useKeyboardNavigation((dir) => {
    setDirection(dir);
  });

  return <div data-testid="navigation-direction">{direction}</div>;
};

// Test component for focus management hook
const FocusManagementTest: React.FC = () => {
  const { focusedElement, moveFocus } = useFocusManagement();

  return (
    <div>
      <button>Button 1</button>
      <button>Button 2</button>
      <button>Button 3</button>
      <div data-testid="focused-element">
        {focusedElement?.textContent || 'none'}
      </div>
      <button onClick={() => moveFocus('next')}>Move Focus Next</button>
      <button onClick={() => moveFocus('prev')}>Move Focus Prev</button>
    </div>
  );
};

describe('AccessibilityContext', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset document classes
    document.documentElement.className = '';
    document.body.className = '';
  });

  describe('AccessibilityProvider', () => {
    test('should provide default accessibility settings', () => {
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false');
      expect(screen.getByTestId('large-text')).toHaveTextContent('false');
    });

    test('should load settings from localStorage', () => {
      localStorage.setItem('accessibility-settings', JSON.stringify({
        highContrast: true,
        reducedMotion: true,
        largeText: true,
      }));

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true');
      expect(screen.getByTestId('large-text')).toHaveTextContent('true');
    });

    test('should update settings and save to localStorage', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      await user.click(screen.getByText('Toggle High Contrast'));

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      
      const savedSettings = JSON.parse(localStorage.getItem('accessibility-settings') || '{}');
      expect(savedSettings.highContrast).toBe(true);
    });

    test('should apply CSS classes based on settings', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      await user.click(screen.getByText('Toggle High Contrast'));
      expect(document.documentElement).toHaveClass('high-contrast');

      await user.click(screen.getByText('Toggle Reduced Motion'));
      expect(document.documentElement).toHaveClass('reduced-motion');

      await user.click(screen.getByText('Toggle Large Text'));
      expect(document.documentElement).toHaveClass('large-text');
      expect(document.documentElement.style.fontSize).toBe('120%');
    });

    test('should detect keyboard vs mouse usage', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      // Initially should be false
      expect(screen.getByTestId('keyboard-user')).toHaveTextContent('false');

      // Simulate Tab key press
      await user.keyboard('{Tab}');
      
      await waitFor(() => {
        expect(screen.getByTestId('keyboard-user')).toHaveTextContent('true');
        expect(document.body).toHaveClass('keyboard-user');
      });

      // Simulate mouse click
      fireEvent.mouseDown(document.body);
      
      await waitFor(() => {
        expect(screen.getByTestId('keyboard-user')).toHaveTextContent('false');
        expect(document.body).toHaveClass('mouse-user');
      });
    });

    test('should detect user preferences from media queries', () => {
      // Mock media queries
      const mockMatchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)' || query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true');
    });

    test('should provide color contrast validation results', () => {
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      const contrastResults = screen.getByTestId('contrast-results');
      const results = JSON.parse(contrastResults.textContent || '{}');
      
      expect(results).toHaveProperty('ratio');
      expect(results).toHaveProperty('level');
      expect(results).toHaveProperty('isAccessible');
    });

    test('should create live regions for announcements', () => {
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(document.getElementById('polite-announcements')).toBeInTheDocument();
      expect(document.getElementById('assertive-announcements')).toBeInTheDocument();
    });

    test('should handle screen reader announcements', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      await user.click(screen.getByText('Announce'));

      // Check that announcement elements are created
      const announcements = document.querySelectorAll('[aria-live]');
      expect(announcements.length).toBeGreaterThan(0);
    });
  });

  describe('useKeyboardNavigation hook', () => {
    test('should handle keyboard navigation events', async () => {
      const user = userEvent.setup();
      
      render(<KeyboardNavigationTest />);

      await user.keyboard('{ArrowLeft}');
      expect(screen.getByTestId('navigation-direction')).toHaveTextContent('prev');

      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('navigation-direction')).toHaveTextContent('next');

      await user.keyboard('{Home}');
      expect(screen.getByTestId('navigation-direction')).toHaveTextContent('first');

      await user.keyboard('{End}');
      expect(screen.getByTestId('navigation-direction')).toHaveTextContent('last');

      await user.keyboard('{PageUp}');
      expect(screen.getByTestId('navigation-direction')).toHaveTextContent('prev');

      await user.keyboard('{PageDown}');
      expect(screen.getByTestId('navigation-direction')).toHaveTextContent('next');
    });

    test('should not handle navigation when input is focused', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <input data-testid="input" />
          <KeyboardNavigationTest />
        </div>
      );

      const input = screen.getByTestId('input');
      await user.click(input);

      await user.keyboard('{ArrowLeft}');
      expect(screen.getByTestId('navigation-direction')).toHaveTextContent('');
    });
  });

  describe('useFocusManagement hook', () => {
    test('should track focused element', async () => {
      const user = userEvent.setup();
      
      render(<FocusManagementTest />);

      const button1 = screen.getByText('Button 1');
      await user.click(button1);

      expect(screen.getByTestId('focused-element')).toHaveTextContent('Button 1');
    });

    test('should move focus programmatically', async () => {
      const user = userEvent.setup();
      
      render(<FocusManagementTest />);

      const button1 = screen.getByText('Button 1');
      await user.click(button1);

      await user.click(screen.getByText('Move Focus Next'));
      expect(document.activeElement?.textContent).toBe('Button 2');

      await user.click(screen.getByText('Move Focus Prev'));
      expect(document.activeElement?.textContent).toBe('Button 1');
    });

    test('should wrap focus at boundaries', async () => {
      const user = userEvent.setup();
      
      render(<FocusManagementTest />);

      const button3 = screen.getByText('Button 3');
      await user.click(button3);

      await user.click(screen.getByText('Move Focus Next'));
      expect(document.activeElement?.textContent).toBe('Button 1');

      const button1 = screen.getByText('Button 1');
      await user.click(button1);

      await user.click(screen.getByText('Move Focus Prev'));
      expect(document.activeElement?.textContent).toBe('Move Focus Prev');
    });
  });

  describe('Error handling', () => {
    test('should throw error when useAccessibility is used outside provider', () => {
      const TestComponentWithoutProvider = () => {
        useAccessibility();
        return <div>Test</div>;
      };

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useAccessibility must be used within an AccessibilityProvider');
    });
  });
});