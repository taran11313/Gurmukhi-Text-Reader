import {
  hexToRgb,
  getRelativeLuminance,
  getContrastRatio,
  validateThemeAccessibility,
  ScreenReaderUtils,
  KeyboardNavigation,
  AriaUtils,
  FocusManager,
} from '../accessibility';

describe('Accessibility Utilities', () => {
  describe('Color Contrast Utilities', () => {
    describe('hexToRgb', () => {
      test('should convert hex colors to RGB', () => {
        expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
        expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
        expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
        expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
        expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      });

      test('should handle hex colors without #', () => {
        expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      });

      test('should return null for invalid hex colors', () => {
        expect(hexToRgb('invalid')).toBeNull();
        expect(hexToRgb('#GGG')).toBeNull();
        expect(hexToRgb('')).toBeNull();
      });
    });

    describe('getRelativeLuminance', () => {
      test('should calculate relative luminance correctly', () => {
        // White should have luminance of 1
        expect(getRelativeLuminance(255, 255, 255)).toBeCloseTo(1, 2);
        
        // Black should have luminance of 0
        expect(getRelativeLuminance(0, 0, 0)).toBeCloseTo(0, 2);
        
        // Red should have specific luminance
        const redLuminance = getRelativeLuminance(255, 0, 0);
        expect(redLuminance).toBeGreaterThan(0);
        expect(redLuminance).toBeLessThan(1);
      });
    });

    describe('getContrastRatio', () => {
      test('should calculate contrast ratio between colors', () => {
        // Black on white should have high contrast
        const blackWhite = getContrastRatio('#000000', '#FFFFFF');
        expect(blackWhite.ratio).toBeCloseTo(21, 0);
        expect(blackWhite.level).toBe('AAA');
        expect(blackWhite.isAccessible).toBe(true);

        // Same colors should have ratio of 1
        const sameColor = getContrastRatio('#FF0000', '#FF0000');
        expect(sameColor.ratio).toBeCloseTo(1, 1);
        expect(sameColor.level).toBe('FAIL');
        expect(sameColor.isAccessible).toBe(false);
      });

      test('should handle invalid colors', () => {
        const result = getContrastRatio('invalid', '#FFFFFF');
        expect(result.ratio).toBe(0);
        expect(result.level).toBe('FAIL');
        expect(result.isAccessible).toBe(false);
      });
    });

    describe('validateThemeAccessibility', () => {
      test('should validate religious theme colors', () => {
        const results = validateThemeAccessibility();
        
        // Check that results contain expected color combinations
        expect(results.textOnBackground).toBeDefined();
        expect(results.textOnWhite).toBeDefined();
        expect(results.saffronOnCream).toBeDefined();
        expect(results.deepBlueOnCream).toBeDefined();
        
        // Main text combinations should be accessible
        expect(results.textOnBackground.isAccessible).toBe(true);
        expect(results.textOnWhite.isAccessible).toBe(true);
      });
    });
  });

  describe('Screen Reader Utilities', () => {
    beforeEach(() => {
      // Clear any existing announcements
      document.body.innerHTML = '';
    });

    describe('announce', () => {
      test('should create announcement element', () => {
        ScreenReaderUtils.announce('Test message');
        
        const announcements = document.querySelectorAll('[aria-live]');
        expect(announcements.length).toBeGreaterThan(0);
      });

      test('should set correct aria-live priority', () => {
        ScreenReaderUtils.announce('Polite message', 'polite');
        ScreenReaderUtils.announce('Assertive message', 'assertive');
        
        const politeAnnouncement = document.querySelector('[aria-live="polite"]');
        const assertiveAnnouncement = document.querySelector('[aria-live="assertive"]');
        
        expect(politeAnnouncement).toBeInTheDocument();
        expect(assertiveAnnouncement).toBeInTheDocument();
      });

      test('should remove announcement after timeout', (done) => {
        ScreenReaderUtils.announce('Test message');
        
        const initialCount = document.querySelectorAll('.sr-only').length;
        
        setTimeout(() => {
          const finalCount = document.querySelectorAll('.sr-only').length;
          expect(finalCount).toBeLessThan(initialCount);
          done();
        }, 1100);
      });
    });

    describe('createLiveRegion', () => {
      test('should create live region with correct attributes', () => {
        const region = ScreenReaderUtils.createLiveRegion('test-region', 'assertive');
        
        expect(region.id).toBe('test-region');
        expect(region.getAttribute('aria-live')).toBe('assertive');
        expect(region.getAttribute('aria-atomic')).toBe('true');
        expect(region.className).toContain('sr-only');
      });

      test('should return existing region if already exists', () => {
        const region1 = ScreenReaderUtils.createLiveRegion('test-region');
        const region2 = ScreenReaderUtils.createLiveRegion('test-region');
        
        expect(region1).toBe(region2);
      });
    });

    describe('updateLiveRegion', () => {
      test('should update existing live region content', () => {
        ScreenReaderUtils.createLiveRegion('test-region');
        ScreenReaderUtils.updateLiveRegion('test-region', 'Updated message');
        
        const region = document.getElementById('test-region');
        expect(region?.textContent).toBe('Updated message');
      });

      test('should handle non-existent region gracefully', () => {
        expect(() => {
          ScreenReaderUtils.updateLiveRegion('non-existent', 'Message');
        }).not.toThrow();
      });
    });
  });

  describe('Keyboard Navigation Utilities', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div>
          <button>Button 1</button>
          <a href="#">Link 1</a>
          <input type="text" />
          <button disabled>Disabled Button</button>
          <select><option>Option</option></select>
          <textarea></textarea>
          <div tabindex="0">Focusable Div</div>
          <div tabindex="-1">Non-focusable Div</div>
        </div>
      `;
    });

    describe('isFocusable', () => {
      test('should identify focusable elements', () => {
        const button = document.querySelector('button') as HTMLElement;
        const link = document.querySelector('a') as HTMLElement;
        const input = document.querySelector('input') as HTMLElement;
        const disabledButton = document.querySelector('button[disabled]') as HTMLElement;
        const focusableDiv = document.querySelector('[tabindex="0"]') as HTMLElement;
        const nonFocusableDiv = document.querySelector('[tabindex="-1"]') as HTMLElement;
        
        expect(KeyboardNavigation.isFocusable(button)).toBe(true);
        expect(KeyboardNavigation.isFocusable(link)).toBe(true);
        expect(KeyboardNavigation.isFocusable(input)).toBe(true);
        expect(KeyboardNavigation.isFocusable(disabledButton)).toBe(false);
        expect(KeyboardNavigation.isFocusable(focusableDiv)).toBe(true);
        expect(KeyboardNavigation.isFocusable(nonFocusableDiv)).toBe(false);
      });
    });

    describe('getFocusableElements', () => {
      test('should return all focusable elements in container', () => {
        const container = document.body;
        const focusableElements = KeyboardNavigation.getFocusableElements(container);
        
        expect(focusableElements.length).toBe(6); // button, link, input, select, textarea, focusable div
        expect(focusableElements.some(el => el.tagName === 'BUTTON' && !el.hasAttribute('disabled'))).toBe(true);
        expect(focusableElements.some(el => el.tagName === 'A')).toBe(true);
        expect(focusableElements.some(el => el.tagName === 'INPUT')).toBe(true);
      });
    });

    describe('trapFocus', () => {
      test('should trap focus within container', () => {
        const container = document.body;
        const focusableElements = KeyboardNavigation.getFocusableElements(container);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Mock Tab key event on last element
        lastElement.focus();
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
        Object.defineProperty(tabEvent, 'preventDefault', { value: jest.fn() });
        
        KeyboardNavigation.trapFocus(container, tabEvent);
        
        expect(tabEvent.preventDefault).toHaveBeenCalled();
      });
    });
  });

  describe('ARIA Utilities', () => {
    describe('generateId', () => {
      test('should generate unique IDs', () => {
        const id1 = AriaUtils.generateId();
        const id2 = AriaUtils.generateId();
        const id3 = AriaUtils.generateId('custom');
        
        expect(id1).toMatch(/^aria-/);
        expect(id2).toMatch(/^aria-/);
        expect(id3).toMatch(/^custom-/);
        expect(id1).not.toBe(id2);
      });
    });

    describe('setDescribedBy and removeDescribedBy', () => {
      test('should manage aria-describedby relationships', () => {
        const element = document.createElement('div');
        
        AriaUtils.setDescribedBy(element, 'desc1');
        expect(element.getAttribute('aria-describedby')).toBe('desc1');
        
        AriaUtils.setDescribedBy(element, 'desc2');
        expect(element.getAttribute('aria-describedby')).toBe('desc1 desc2');
        
        AriaUtils.removeDescribedBy(element, 'desc1');
        expect(element.getAttribute('aria-describedby')).toBe('desc2');
        
        AriaUtils.removeDescribedBy(element, 'desc2');
        expect(element.hasAttribute('aria-describedby')).toBe(false);
      });

      test('should not add duplicate IDs', () => {
        const element = document.createElement('div');
        
        AriaUtils.setDescribedBy(element, 'desc1');
        AriaUtils.setDescribedBy(element, 'desc1');
        
        expect(element.getAttribute('aria-describedby')).toBe('desc1');
      });
    });
  });

  describe('Focus Manager', () => {
    beforeEach(() => {
      document.body.innerHTML = '<button>Test Button</button>';
      FocusManager['focusHistory'] = []; // Reset focus history
    });

    describe('saveFocus and restoreFocus', () => {
      test('should save and restore focus', () => {
        const button = document.querySelector('button') as HTMLElement;
        button.focus();
        
        FocusManager.saveFocus();
        
        // Change focus
        document.body.focus();
        
        FocusManager.restoreFocus();
        
        expect(document.activeElement).toBe(button);
      });

      test('should handle multiple saved focuses', () => {
        const button = document.querySelector('button') as HTMLElement;
        button.focus();
        
        FocusManager.saveFocus();
        
        // Add another element and save focus again
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        
        FocusManager.saveFocus();
        
        // Restore should go to input first
        document.body.focus();
        FocusManager.restoreFocus();
        expect(document.activeElement).toBe(input);
        
        // Then to button
        document.body.focus();
        FocusManager.restoreFocus();
        expect(document.activeElement).toBe(button);
      });
    });

    describe('setFocus', () => {
      test('should set focus to element', () => {
        const button = document.querySelector('button') as HTMLElement;
        
        FocusManager.setFocus(button);
        
        expect(document.activeElement).toBe(button);
      });

      test('should handle scroll into view', () => {
        const button = document.querySelector('button') as HTMLElement;
        const scrollIntoViewSpy = jest.spyOn(button, 'scrollIntoView').mockImplementation();
        
        FocusManager.setFocus(button, true);
        
        expect(scrollIntoViewSpy).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center'
        });
        
        scrollIntoViewSpy.mockRestore();
      });
    });
  });
});