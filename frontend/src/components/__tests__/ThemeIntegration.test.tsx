import { render, screen } from '@testing-library/react';
import { ThemeProvider, BackgroundPattern } from '../index';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Test component that demonstrates theme integration
const ThemedApp = () => (
  <ThemeProvider>
    <BackgroundPattern pattern="subtle" opacity={0.05} />
    <div 
      data-testid="themed-content"
      style={{
        color: 'var(--color-dark-brown)',
        backgroundColor: 'var(--color-cream)',
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--border-radius-md)',
        boxShadow: 'var(--shadow-soft)',
        fontFamily: 'var(--font-english)',
      }}
    >
      <h1 
        data-testid="themed-heading"
        style={{
          color: 'var(--color-saffron)',
          fontFamily: 'var(--font-gurmukhi)',
        }}
      >
        Religious Text Reader
      </h1>
      <p data-testid="themed-text">
        Welcome to the sacred reading experience
      </p>
    </div>
  </ThemeProvider>
);

describe('Theme Integration', () => {
  let originalStyles: { [key: string]: string } = {};

  beforeEach(() => {
    // Store and clear original CSS custom properties
    const root = document.documentElement;
    originalStyles = {};
    
    const themeVars = [
      '--color-saffron', '--color-deep-blue', '--color-cream', '--color-gold',
      '--color-dark-brown', '--color-light-saffron', '--color-pale-blue', '--color-warm-white',
      '--font-gurmukhi', '--font-english', '--spacing-xs', '--spacing-sm', '--spacing-md', 
      '--spacing-lg', '--spacing-xl', '--border-radius-sm', '--border-radius-md', 
      '--border-radius-lg', '--shadow-soft', '--shadow-medium', '--shadow-strong'
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

  it('integrates ThemeProvider with BackgroundPattern successfully', () => {
    render(<ThemedApp />);
    
    // Check that both components render
    expect(screen.getByTestId('themed-content')).toBeInTheDocument();
    expect(document.querySelector('.background-pattern')).toBeInTheDocument();
  });

  it('applies religious color palette correctly', () => {
    render(<ThemedApp />);
    
    const root = document.documentElement;
    
    // Verify all religious colors are applied
    expect(root.style.getPropertyValue('--color-saffron')).toBe('#FF9933');
    expect(root.style.getPropertyValue('--color-deep-blue')).toBe('#1B365D');
    expect(root.style.getPropertyValue('--color-cream')).toBe('#FAF7F0');
    expect(root.style.getPropertyValue('--color-dark-brown')).toBe('#3C2415');
    expect(root.style.getPropertyValue('--color-gold')).toBe('#D4AF37');
    expect(root.style.getPropertyValue('--color-light-saffron')).toBe('#FFB366');
    expect(root.style.getPropertyValue('--color-pale-blue')).toBe('#E8F0F7');
    expect(root.style.getPropertyValue('--color-warm-white')).toBe('#FFFEF9');
  });

  it('applies religious fonts correctly', () => {
    render(<ThemedApp />);
    
    const root = document.documentElement;
    
    expect(root.style.getPropertyValue('--font-gurmukhi')).toBe("'Noto Sans Gurmukhi', sans-serif");
    expect(root.style.getPropertyValue('--font-english')).toBe("'Crimson Text', serif");
  });

  it('applies complete spacing system', () => {
    render(<ThemedApp />);
    
    const root = document.documentElement;
    
    expect(root.style.getPropertyValue('--spacing-xs')).toBe('0.25rem');
    expect(root.style.getPropertyValue('--spacing-sm')).toBe('0.5rem');
    expect(root.style.getPropertyValue('--spacing-md')).toBe('1rem');
    expect(root.style.getPropertyValue('--spacing-lg')).toBe('1.5rem');
    expect(root.style.getPropertyValue('--spacing-xl')).toBe('2rem');
  });

  it('applies design system variables (borders and shadows)', () => {
    render(<ThemedApp />);
    
    const root = document.documentElement;
    
    // Border radius
    expect(root.style.getPropertyValue('--border-radius-sm')).toBe('0.25rem');
    expect(root.style.getPropertyValue('--border-radius-md')).toBe('0.5rem');
    expect(root.style.getPropertyValue('--border-radius-lg')).toBe('1rem');
    
    // Shadows
    expect(root.style.getPropertyValue('--shadow-soft')).toBe('0 2px 4px rgba(0, 0, 0, 0.1)');
    expect(root.style.getPropertyValue('--shadow-medium')).toBe('0 4px 8px rgba(0, 0, 0, 0.15)');
    expect(root.style.getPropertyValue('--shadow-strong')).toBe('0 8px 16px rgba(0, 0, 0, 0.2)');
  });

  it('renders content with proper structure', () => {
    render(<ThemedApp />);
    
    expect(screen.getByTestId('themed-content')).toBeInTheDocument();
    expect(screen.getByTestId('themed-heading')).toHaveTextContent('Religious Text Reader');
    expect(screen.getByTestId('themed-text')).toHaveTextContent('Welcome to the sacred reading experience');
  });

  it('background pattern has correct accessibility attributes', () => {
    render(<ThemedApp />);
    
    const pattern = document.querySelector('.background-pattern');
    expect(pattern).toHaveAttribute('aria-hidden', 'true');
    expect(pattern).toHaveClass('background-pattern--subtle');
  });
});