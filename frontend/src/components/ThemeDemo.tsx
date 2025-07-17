import React from 'react';
import { useTheme } from './ThemeProvider';
import './ThemeDemo.css';

export const ThemeDemo: React.FC = () => {
  const theme = useTheme();

  return (
    <div className="theme-demo">
      <div className="theme-demo__section">
        <h2 className="theme-demo__title">Religious Color Palette</h2>
        <div className="theme-demo__colors">
          <div className="color-swatch color-swatch--saffron">
            <span>Saffron</span>
            <code>{theme.colors.saffron}</code>
          </div>
          <div className="color-swatch color-swatch--deep-blue">
            <span>Deep Blue</span>
            <code>{theme.colors.deepBlue}</code>
          </div>
          <div className="color-swatch color-swatch--cream">
            <span>Cream</span>
            <code>{theme.colors.cream}</code>
          </div>
          <div className="color-swatch color-swatch--gold">
            <span>Gold</span>
            <code>{theme.colors.gold}</code>
          </div>
        </div>
      </div>

      <div className="theme-demo__section">
        <h2 className="theme-demo__title">Typography</h2>
        <div className="theme-demo__typography">
          <p className="font-sample font-sample--gurmukhi">
            ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ
          </p>
          <p className="font-sample font-sample--english">
            Sacred text in beautiful typography
          </p>
        </div>
      </div>

      <div className="theme-demo__section">
        <h2 className="theme-demo__title">Design Elements</h2>
        <div className="theme-demo__elements">
          <button className="themed-button themed-button--primary">
            Primary Action
          </button>
          <button className="themed-button themed-button--secondary">
            Secondary Action
          </button>
          <div className="themed-card">
            <h3>Sacred Reading Card</h3>
            <p>This card demonstrates the religious theming with appropriate shadows, borders, and colors.</p>
          </div>
        </div>
      </div>
    </div>
  );
};