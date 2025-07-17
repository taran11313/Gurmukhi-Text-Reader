import React from 'react';
import './BackgroundPattern.css';

interface BackgroundPatternProps {
  pattern?: 'lotus' | 'geometric' | 'subtle';
  opacity?: number;
  className?: string;
}

export const BackgroundPattern: React.FC<BackgroundPatternProps> = ({
  pattern = 'subtle',
  opacity = 0.05,
  className = '',
}) => {
  return (
    <div 
      className={`background-pattern background-pattern--${pattern} ${className}`}
      style={{ '--pattern-opacity': opacity } as React.CSSProperties}
      aria-hidden="true"
    />
  );
};