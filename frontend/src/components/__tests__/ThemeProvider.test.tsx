import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme, defaultReligiousTheme } from '../ThemeProvider';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Test component that uses the theme
const TestComponent = () => {
  const theme = useTheme();
  return (
    <div data-testid="test-component">
      <span data-testid="saffron-color">{theme.colors.saffron}</span>
      <span data-testid="gurmukhi-font">{theme.fonts.gurmukhi}</span>
      <span data-testid="spacing-md">{theme.spacing.md}</span>
    </div>
  );
};

describe('ThemeProvider', () => {
  let originalStyles: { [key: string]: string } = {};

  beforeEach(() => {
    // Store original CSS custom properties
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    originalStyles = {};
    
    // Clear any existing theme variables
    const themeVars = [
      '--color-saffron', '--color-deep-blue', '--color-cream', '--color-gold',
      '--font-gurmukhi', '--font-english', '--spacing-md', '--border-radius-sm',
      '--shadow-soft'
    ];
    
    themeVars.forEach(varName => {
      originalStyles[varName] = root.style.getPropertyValue(varName);
      root.style.removeProperty(varName);
    });
  });

  afterEach(() => {
    // Restore original styles
    const root = document.documentElement;
    Object.entries(originalStyles).forEach(([prop, value]) => {
      if (value) {
        root.style.setProperty(prop, value);
      } else {
        root.style.removeProperty(prop);
      }
    });
  });

  it('provides default religious theme to children', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('saffron-color')).toHaveTextContent('#FF9933');
    expect(screen.getByTestId('gurmukhi-font')).toHaveTextContent("'Noto Sans Gurmukhi', sans-serif");
    expect(screen.getByTestId('spacing-md')).toHaveTextContent('1rem');
  });

  it('applies CSS custom properties to document root', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-saffron')).toBe('#FF9933');
    expect(root.style.getPropertyValue('--color-deep-blue')).toBe('#1B365D');
    expect(root.style.getPropertyValue('--color-cream')).toBe('#FAF7F0');
    expect(root.style.getPropertyValue('--color-gold')).toBe('#D4AF37');
    expect(root.style.getPropertyValue('--font-gurmukhi')).toBe("'Noto Sans Gurmukhi', sans-serif");
    expect(root.style.getPropertyValue('--font-english')).toBe("'Crimson Text', serif");
  });

  it('applies spacing variables correctly', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--spacing-xs')).toBe('0.25rem');
    expect(root.style.getPropertyValue('--spacing-sm')).toBe('0.5rem');
    expect(root.style.getPropertyValue('--spacing-md')).toBe('1rem');
    expect(root.style.getPropertyValue('--spacing-lg')).toBe('1.5rem');
    expect(root.style.getPropertyValue('--spacing-xl')).toBe('2rem');
  });

  it('applies border radius variables correctly', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--border-radius-sm')).toBe('0.25rem');
    expect(root.style.getPropertyValue('--border-radius-md')).toBe('0.5rem');
    expect(root.style.getPropertyValue('--border-radius-lg')).toBe('1rem');
  });

  it('applies shadow variables correctly', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--shadow-soft')).toBe('0 2px 4px rgba(0, 0, 0, 0.1)');
    expect(root.style.getPropertyValue('--shadow-medium')).toBe('0 4px 8px rgba(0, 0, 0, 0.15)');
    expect(root.style.getPropertyValue('--shadow-strong')).toBe('0 8px 16px rgba(0, 0, 0, 0.2)');
  });

  it('accepts custom theme configuration', () => {
    const customTheme = {
      ...defaultReligiousTheme,
      colors: {
        ...defaultReligiousTheme.colors,
        saffron: '#FF0000',
      },
    };

    render(
      <ThemeProvider theme={customTheme}>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('saffron-color')).toHaveTextContent('#FF0000');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-saffron')).toBe('#FF0000');
  });

  it('throws error when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    console.error = originalError;
  });

  it('updates CSS variables when theme changes', () => {
    const { rerender } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const customTheme = {
      ...defaultReligiousTheme,
      colors: {
        ...defaultReligiousTheme.colors,
        saffron: '#CUSTOM',
      },
    };

    rerender(
      <ThemeProvider theme={customTheme}>
        <TestComponent />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-saffron')).toBe('#CUSTOM');
  });
});