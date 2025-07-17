import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { AriaUtils } from '../utils/accessibility';
import './NavigationControls.css';

export interface NavigationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
  disabled?: boolean;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}) => {
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Accessibility context
  const { announceToScreenReader } = useAccessibility();
  
  // Generate unique IDs for ARIA relationships
  const progressId = AriaUtils.generateId('progress');
  const buttonsId = AriaUtils.generateId('nav-buttons');
  const shortcutsId = AriaUtils.generateId('shortcuts');

  // Update input when currentPage changes externally
  useEffect(() => {
    setPageInput(currentPage.toString());
    setInputError('');
  }, [currentPage]);

  // Navigation handlers with accessibility announcements
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1 && !disabled) {
      const newPage = currentPage - 1;
      onPageChange(newPage);
      announceToScreenReader(`Navigated to page ${newPage} of ${totalPages}`);
    }
  }, [currentPage, onPageChange, disabled, announceToScreenReader, totalPages]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages && !disabled) {
      const newPage = currentPage + 1;
      onPageChange(newPage);
      announceToScreenReader(`Navigated to page ${newPage} of ${totalPages}`);
    }
  }, [currentPage, totalPages, onPageChange, disabled, announceToScreenReader]);

  const handleFirstPage = useCallback(() => {
    if (currentPage !== 1 && !disabled) {
      onPageChange(1);
      announceToScreenReader(`Navigated to first page`);
    }
  }, [currentPage, onPageChange, disabled, announceToScreenReader]);

  const handleLastPage = useCallback(() => {
    if (currentPage !== totalPages && !disabled) {
      onPageChange(totalPages);
      announceToScreenReader(`Navigated to last page, page ${totalPages}`);
    }
  }, [currentPage, totalPages, onPageChange, disabled, announceToScreenReader]);

  // Page input validation and handling
  const validatePageInput = useCallback((value: string): boolean => {
    const pageNumber = parseInt(value, 10);
    
    if (isNaN(pageNumber)) {
      setInputError('Please enter a valid number');
      return false;
    }
    
    if (pageNumber < 1) {
      setInputError('Page number must be at least 1');
      return false;
    }
    
    if (pageNumber > totalPages) {
      setInputError(`Page number cannot exceed ${totalPages}`);
      return false;
    }
    
    setInputError('');
    return true;
  }, [totalPages]);

  const handlePageInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPageInput(value);
    
    // Clear error when user starts typing
    if (inputError) {
      setInputError('');
    }
  }, [inputError]);

  const handlePageInputSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    
    if (disabled) return;
    
    const trimmedValue = pageInput.trim();
    
    if (validatePageInput(trimmedValue)) {
      const pageNumber = parseInt(trimmedValue, 10);
      if (pageNumber !== currentPage) {
        onPageChange(pageNumber);
      }
    }
  }, [pageInput, validatePageInput, currentPage, onPageChange, disabled]);

  const handlePageInputBlur = useCallback(() => {
    const trimmedValue = pageInput.trim();
    
    // Reset to current page if input is invalid or empty
    if (!trimmedValue || !validatePageInput(trimmedValue) || inputError) {
      setPageInput(currentPage.toString());
      setInputError('');
    }
  }, [inputError, pageInput, currentPage, validatePageInput]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if input is focused or navigation is disabled
      if (disabled || document.activeElement === inputRef.current) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          handlePreviousPage();
          break;
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          handleNextPage();
          break;
        case 'Home':
          event.preventDefault();
          handleFirstPage();
          break;
        case 'End':
          event.preventDefault();
          handleLastPage();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePreviousPage, handleNextPage, handleFirstPage, handleLastPage, disabled]);

  // Calculate progress percentage
  const progressPercentage = totalPages > 0 ? ((currentPage - 1) / (totalPages - 1)) * 100 : 0;

  return (
    <nav 
      className="navigation-controls" 
      role="navigation" 
      aria-label="Page navigation for Punjabi religious text"
      aria-describedby={`${progressId} ${shortcutsId}`}
    >
      {/* Skip link for keyboard users */}
      <a href="#main-content" className="skip-link sr-only-focusable">
        Skip to main content
      </a>

      {/* Progress Indicator */}
      <section 
        id={progressId}
        className="navigation-controls__progress"
        aria-labelledby={`${progressId}-label`}
      >
        <h3 id={`${progressId}-label`} className="sr-only">Reading Progress</h3>
        <div className="navigation-controls__progress-bar">
          <div 
            className="navigation-controls__progress-fill"
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={currentPage}
            aria-valuemin={1}
            aria-valuemax={totalPages}
            aria-label={`Reading progress: page ${currentPage} of ${totalPages}, ${Math.round(progressPercentage)}% complete`}
            aria-describedby={`${progressId}-text`}
          />
        </div>
        <div 
          id={`${progressId}-text`}
          className="navigation-controls__progress-text"
          role="status"
          aria-live="polite"
        >
          {currentPage} of {totalPages} pages
        </div>
      </section>

      {/* Navigation Buttons */}
      <div 
        id={buttonsId}
        className="navigation-controls__buttons"
        role="group"
        aria-label="Page navigation buttons"
      >
        {/* First Page Button */}
        <button
          className="navigation-controls__btn navigation-controls__btn--first"
          onClick={handleFirstPage}
          disabled={disabled || currentPage === 1}
          aria-label={`Go to first page${currentPage === 1 ? ' (currently on first page)' : ''}`}
          title="First page (Home key)"
          type="button"
        >
          <span aria-hidden="true">⏮</span>
          <span className="sr-only">First page</span>
        </button>

        {/* Previous Page Button */}
        <button
          className="navigation-controls__btn navigation-controls__btn--prev"
          onClick={handlePreviousPage}
          disabled={disabled || currentPage === 1}
          aria-label={`Go to previous page${currentPage === 1 ? ' (currently on first page)' : `, page ${currentPage - 1}`}`}
          title="Previous page (← or Page Up)"
          type="button"
        >
          <span aria-hidden="true">◀</span>
          <span className="sr-only">Previous page</span>
        </button>

        {/* Page Input */}
        <form 
          className="navigation-controls__page-input-form"
          onSubmit={handlePageInputSubmit}
          role="search"
          aria-label="Jump to specific page"
        >
          <div className="navigation-controls__page-input-container">
            <label 
              htmlFor="page-input" 
              className="navigation-controls__page-input-label"
            >
              Page:
            </label>
            <input
              ref={inputRef}
              id="page-input"
              type="number"
              min="1"
              max={totalPages}
              className={`navigation-controls__page-input ${inputError ? 'navigation-controls__page-input--error' : ''}`}
              value={pageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputBlur}
              disabled={disabled}
              aria-describedby={inputError ? 'page-input-error page-input-help' : 'page-input-help'}
              aria-invalid={inputError ? 'true' : 'false'}
              aria-label={`Jump to page number, current page is ${currentPage}`}
              title="Enter page number and press Enter"
            />
            <div id="page-input-help" className="sr-only">
              Enter a page number between 1 and {totalPages}, then press Enter to navigate
            </div>
            {inputError && (
              <div 
                id="page-input-error" 
                className="navigation-controls__page-input-error"
                role="alert"
                aria-live="assertive"
              >
                {inputError}
              </div>
            )}
          </div>
        </form>

        {/* Next Page Button */}
        <button
          className="navigation-controls__btn navigation-controls__btn--next"
          onClick={handleNextPage}
          disabled={disabled || currentPage === totalPages}
          aria-label={`Go to next page${currentPage === totalPages ? ' (currently on last page)' : `, page ${currentPage + 1}`}`}
          title="Next page (→ or Page Down)"
          type="button"
        >
          <span aria-hidden="true">▶</span>
          <span className="sr-only">Next page</span>
        </button>

        {/* Last Page Button */}
        <button
          className="navigation-controls__btn navigation-controls__btn--last"
          onClick={handleLastPage}
          disabled={disabled || currentPage === totalPages}
          aria-label={`Go to last page${currentPage === totalPages ? ' (currently on last page)' : `, page ${totalPages}`}`}
          title="Last page (End key)"
          type="button"
        >
          <span aria-hidden="true">⏭</span>
          <span className="sr-only">Last page</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Help */}
      <aside 
        id={shortcutsId}
        className="navigation-controls__shortcuts" 
        role="complementary"
        aria-label="Keyboard shortcuts information"
      >
        <details className="navigation-controls__shortcuts-details">
          <summary 
            className="navigation-controls__shortcuts-summary"
            aria-expanded="false"
          >
            <span>Keyboard Shortcuts</span>
            <span className="sr-only"> (expandable help section)</span>
          </summary>
          <div 
            className="navigation-controls__shortcuts-content"
            role="list"
            aria-label="Available keyboard shortcuts"
          >
            <div className="navigation-controls__shortcut" role="listitem">
              <kbd aria-label="Left arrow key">←</kbd> or <kbd aria-label="Page up key">Page Up</kbd> - Previous page
            </div>
            <div className="navigation-controls__shortcut" role="listitem">
              <kbd aria-label="Right arrow key">→</kbd> or <kbd aria-label="Page down key">Page Down</kbd> - Next page
            </div>
            <div className="navigation-controls__shortcut" role="listitem">
              <kbd aria-label="Home key">Home</kbd> - First page
            </div>
            <div className="navigation-controls__shortcut" role="listitem">
              <kbd aria-label="End key">End</kbd> - Last page
            </div>
            <div className="navigation-controls__shortcut" role="listitem">
              <kbd aria-label="Plus key">+</kbd> / <kbd aria-label="Minus key">-</kbd> - Zoom in/out
            </div>
            <div className="navigation-controls__shortcut" role="listitem">
              <kbd aria-label="Zero key">0</kbd> - Reset zoom
            </div>
          </div>
        </details>
      </aside>
    </nav>
  );
};