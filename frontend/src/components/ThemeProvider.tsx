import React, { createContext, useContext, ReactNode } from 'react';

// Religious theme configuration
export interface ReligiousTheme {
  colors: {
    saffron: string;
    deepBlue: string;
    cream: string;
    darkBrown: string;
    gold: string;
    // Additional theme colors
    lightSaffron: string;
    paleBlue: string;
    warmWhite: string;
  };
  fonts: {
    gurmukhi: string;
    english: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    soft: string;
    medium: string;
    strong: string;
  };
}

// Default religious theme
export const defaultReligiousTheme: ReligiousTheme = {
  colors: {
    saffron: '#FF9933',
    deepBlue: '#1B365D',
    cream: '#FAF7F0',
    darkBrown: '#3C2415',
    gold: '#D4AF37',
    lightSaffron: '#FFB366',
    paleBlue: '#E8F0F7',
    warmWhite: '#FFFEF9',
  },
  fonts: {
    gurmukhi: "'Noto Sans Gurmukhi', sans-serif",
    english: "'Crimson Text', serif",
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
  shadows: {
    soft: '0 2px 4px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.15)',
    strong: '0 8px 16px rgba(0, 0, 0, 0.2)',
  },
};

// Theme context
const ThemeContext = createContext<ReligiousTheme | undefined>(undefined);

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode;
  theme?: ReligiousTheme;
}

// ThemeProvider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  theme = defaultReligiousTheme 
}) => {
  // Apply CSS custom properties to the document root
  React.useEffect(() => {
    const root = document.documentElement;
    
    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });
    
    // Apply font variables
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value);
    });
    
    // Apply spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    // Apply border radius variables
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--border-radius-${key}`, value);
    });
    
    // Apply shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
export const useTheme = (): ReligiousTheme => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};