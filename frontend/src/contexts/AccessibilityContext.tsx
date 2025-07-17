import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ScreenReaderUtils, validateThemeAccessibility } from '../utils/accessibility';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  announcements: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: (key: keyof AccessibilitySettings, value: boolean) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  isKeyboardUser: boolean;
  colorContrastResults: ReturnType<typeof validateThemeAccessibility>;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  screenReaderMode: false,
  keyboardNavigation: true,
  announcements: true,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('accessibility-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });
  
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [colorContrastResults] = useState(() => validateThemeAccessibility());

  // Detect keyboard vs mouse usage
  useEffect(() => {
    let keyboardUsed = false;
    let mouseUsed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        keyboardUsed = true;
        if (!mouseUsed) {
          setIsKeyboardUser(true);
          document.body.classList.add('keyboard-user');
          document.body.classList.remove('mouse-user');
        }
      }
    };

    const handleMouseDown = () => {
      mouseUsed = true;
      if (keyboardUsed) {
        setIsKeyboardUser(false);
        document.body.classList.add('mouse-user');
        document.body.classList.remove('keyboard-user');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Large text
    if (settings.largeText) {
      root.classList.add('large-text');
      root.style.fontSize = '120%';
    } else {
      root.classList.remove('large-text');
      root.style.fontSize = '';
    }
    
    // Screen reader mode
    if (settings.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
    
    // Save settings to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  // Detect user preferences from media queries
  useEffect(() => {
    // Check if matchMedia is available (not available in some test environments)
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
      
      const updateFromMediaQueries = () => {
        setSettings(prev => ({
          ...prev,
          reducedMotion: prefersReducedMotion.matches,
          highContrast: prefersHighContrast.matches,
        }));
      };
      
      // Initial check
      updateFromMediaQueries();
      
      // Listen for changes
      prefersReducedMotion.addEventListener('change', updateFromMediaQueries);
      prefersHighContrast.addEventListener('change', updateFromMediaQueries);
      
      return () => {
        prefersReducedMotion.removeEventListener('change', updateFromMediaQueries);
        prefersHighContrast.removeEventListener('change', updateFromMediaQueries);
      };
    }
  }, []);

  // Create live regions for announcements
  useEffect(() => {
    ScreenReaderUtils.createLiveRegion('polite-announcements', 'polite');
    ScreenReaderUtils.createLiveRegion('assertive-announcements', 'assertive');
  }, []);

  const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.announcements) {
      ScreenReaderUtils.announce(message, priority);
    }
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    announceToScreenReader,
    isKeyboardUser,
    colorContrastResults,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (
  onNavigate?: (direction: 'prev' | 'next' | 'first' | 'last') => void
) => {
  useEffect(() => {
    if (!onNavigate) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          onNavigate('prev');
          break;
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          onNavigate('next');
          break;
        case 'Home':
          event.preventDefault();
          onNavigate('first');
          break;
        case 'End':
          event.preventDefault();
          onNavigate('last');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);
};

// Hook for focus management
export const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      setFocusedElement(event.target as HTMLElement);
    };

    const handleFocusOut = () => {
      setFocusedElement(null);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const moveFocus = (direction: 'next' | 'prev') => {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    const currentIndex = focusedElement ? focusableElements.indexOf(focusedElement) : -1;
    let nextIndex: number;

    if (direction === 'next') {
      nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
    }

    focusableElements[nextIndex]?.focus();
  };

  return {
    focusedElement,
    moveFocus,
  };
};