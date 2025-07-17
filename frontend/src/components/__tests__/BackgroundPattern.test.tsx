import { render, screen } from '@testing-library/react';
import { BackgroundPattern } from '../BackgroundPattern';
import { describe, it, expect } from 'vitest';

describe('BackgroundPattern', () => {
  it('renders with default props', () => {
    render(<BackgroundPattern />);
    
    const pattern = document.querySelector('.background-pattern');
    expect(pattern).toBeInTheDocument();
    expect(pattern).toHaveClass('background-pattern');
    expect(pattern).toHaveClass('background-pattern--subtle');
  });

  it('applies correct pattern class based on pattern prop', () => {
    const { rerender } = render(<BackgroundPattern pattern="lotus" />);
    
    let pattern = document.querySelector('.background-pattern');
    expect(pattern).toHaveClass('background-pattern--lotus');

    rerender(<BackgroundPattern pattern="geometric" />);
    pattern = document.querySelector('.background-pattern');
    expect(pattern).toHaveClass('background-pattern--geometric');

    rerender(<BackgroundPattern pattern="subtle" />);
    pattern = document.querySelector('.background-pattern');
    expect(pattern).toHaveClass('background-pattern--subtle');
  });

  it('applies custom opacity through CSS custom property', () => {
    render(<BackgroundPattern opacity={0.1} />);
    
    const pattern = document.querySelector('.background-pattern');
    expect(pattern).toHaveStyle({ '--pattern-opacity': '0.1' });
  });

  it('applies additional className when provided', () => {
    render(<BackgroundPattern className="custom-class" />);
    
    const pattern = document.querySelector('.background-pattern');
    expect(pattern).toHaveClass('background-pattern');
    expect(pattern).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<BackgroundPattern />);
    
    const pattern = document.querySelector('.background-pattern');
    expect(pattern).toHaveAttribute('aria-hidden', 'true');
  });

  it('combines all props correctly', () => {
    render(
      <BackgroundPattern 
        pattern="lotus" 
        opacity={0.08} 
        className="test-pattern" 
      />
    );
    
    const pattern = document.querySelector('.background-pattern');
    expect(pattern).toHaveClass('background-pattern');
    expect(pattern).toHaveClass('background-pattern--lotus');
    expect(pattern).toHaveClass('test-pattern');
    expect(pattern).toHaveStyle({ '--pattern-opacity': '0.08' });
    expect(pattern).toHaveAttribute('aria-hidden', 'true');
  });
});