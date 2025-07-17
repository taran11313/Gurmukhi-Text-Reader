/**
 * Accessibility utilities for the Punjabi Religious Reader
 */

// Color contrast calculation utilities
export interface ColorContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'A' | 'FAIL';
  isAccessible: boolean;
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance of a color
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): ColorContrastResult {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    return { ratio: 0, level: 'FAIL', isAccessible: false };
  }
  
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  const ratio = (brightest + 0.05) / (darkest + 0.05);
  
  let level: 'AAA' | 'AA' | 'A' | 'FAIL';
  let isAccessible: boolean;
  
  if (ratio >= 7) {
    level = 'AAA';
    isAccessible = true;
  } else if (ratio >= 4.5) {
    level = 'AA';
    isAccessible = true;
  } else if (ratio >= 3) {
    level = 'A';
    isAccessible = false; // A level is not sufficient for accessibility
  } else {
    level = 'FAIL';
    isAccessible = false;
  }
  
  return { ratio, level, isAccessible };
}

/**
 * Validate religious theme colors for accessibility
 */
export function validateThemeAccessibility() {
  const colors = {
    saffron: '#FF9933',
    deepBlue: '#1B365D',
    cream: '#FAF7F0',
    darkBrown: '#3C2415',
    gold: '#D4AF37',
    lightSaffron: '#FFB366',
    paleBlue: '#E8F0F7',
    warmWhite: '#FFFEF9',
  };
  
  const results = {
    textOnBackground: getContrastRatio(colors.darkBrown, colors.cream),
    textOnWhite: getContrastRatio(colors.darkBrown, colors.warmWhite),
    saffronOnCream: getContrastRatio(colors.saffron, colors.cream),
    deepBlueOnCream: getContrastRatio(colors.deepBlue, colors.cream),
    goldOnDeepBlue: getContrastRatio(colors.gold, colors.deepBlue),
    whiteOnSaffron: getContrastRatio(colors.warmWhite, colors.saffron),
    whiteOnDeepBlue: getContrastRatio(colors.warmWhite, colors.deepBlue),
  };
  
  return results;
}

/**
 * Screen reader utilities
 */
export class ScreenReaderUtils {
  /**
   * Announce text to screen readers
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
  
  /**
   * Create a live region for dynamic content updates
   */
  static createLiveRegion(id: string, priority: 'polite' | 'assertive' = 'polite'): HTMLElement {
    let liveRegion = document.getElementById(id);
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = id;
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }
    
    return liveRegion;
  }
  
  /**
   * Update live region content
   */
  static updateLiveRegion(id: string, message: string): void {
    const liveRegion = document.getElementById(id);
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
  /**
   * Check if element is focusable
   */
  static isFocusable(element: HTMLElement): boolean {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];
    
    return focusableSelectors.some(selector => element.matches(selector));
  }
  
  /**
   * Get all focusable elements within a container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');
    
    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }
  
  /**
   * Trap focus within a container (useful for modals)
   */
  static trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    
    const focusableElements = KeyboardNavigation.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }
}

/**
 * ARIA utilities
 */
export class AriaUtils {
  /**
   * Generate unique ID for ARIA relationships
   */
  static generateId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Set up ARIA describedby relationship
   */
  static setDescribedBy(element: HTMLElement, descriptionId: string): void {
    const existingDescribedBy = element.getAttribute('aria-describedby');
    const describedByIds = existingDescribedBy ? existingDescribedBy.split(' ') : [];
    
    if (!describedByIds.includes(descriptionId)) {
      describedByIds.push(descriptionId);
      element.setAttribute('aria-describedby', describedByIds.join(' '));
    }
  }
  
  /**
   * Remove ARIA describedby relationship
   */
  static removeDescribedBy(element: HTMLElement, descriptionId: string): void {
    const existingDescribedBy = element.getAttribute('aria-describedby');
    if (!existingDescribedBy) return;
    
    const describedByIds = existingDescribedBy.split(' ').filter(id => id !== descriptionId);
    
    if (describedByIds.length > 0) {
      element.setAttribute('aria-describedby', describedByIds.join(' '));
    } else {
      element.removeAttribute('aria-describedby');
    }
  }
}

/**
 * Focus management utilities
 */
export class FocusManager {
  private static focusHistory: HTMLElement[] = [];
  
  /**
   * Save current focus for later restoration
   */
  static saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      FocusManager.focusHistory.push(activeElement);
    }
  }
  
  /**
   * Restore previously saved focus
   */
  static restoreFocus(): void {
    const lastFocused = FocusManager.focusHistory.pop();
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    }
  }
  
  /**
   * Set focus to element with optional scroll behavior
   */
  static setFocus(element: HTMLElement, scrollIntoView: boolean = true): void {
    element.focus();
    if (scrollIntoView) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}