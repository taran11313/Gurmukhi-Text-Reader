import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NavigationControls } from '../NavigationControls';
import { ThemeProvider } from '../ThemeProvider';

// Mock component wrapper with theme
const NavigationControlsWithTheme: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
  disabled?: boolean;
}> = (props) => (
  <ThemeProvider>
    <NavigationControls {...props} />
  </ThemeProvider>
);

describe('NavigationControls', () => {
  let mockOnPageChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPageChange = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders all navigation elements correctly', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      // Check for navigation buttons
      expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();

      // Check for page input
      expect(screen.getByLabelText('Page:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();

      // Check for progress indicator
      expect(screen.getByText('5 of 100 pages')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Check for keyboard shortcuts help
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('displays correct progress percentage', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={25}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      expect(progressBar).toHaveAttribute('aria-valuemin', '1');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Button State Management', () => {
    it('disables previous and first page buttons on first page', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={1}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByLabelText('Go to first page')).toBeDisabled();
      expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
      expect(screen.getByLabelText('Go to next page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to last page')).not.toBeDisabled();
    });

    it('disables next and last page buttons on last page', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={100}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByLabelText('Go to first page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to previous page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to next page')).toBeDisabled();
      expect(screen.getByLabelText('Go to last page')).toBeDisabled();
    });

    it('enables all buttons on middle pages', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={50}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByLabelText('Go to first page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to previous page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to next page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to last page')).not.toBeDisabled();
    });

    it('disables all controls when disabled prop is true', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={50}
          totalPages={100}
          onPageChange={mockOnPageChange}
          disabled={true}
        />
      );

      expect(screen.getByLabelText('Go to first page')).toBeDisabled();
      expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
      expect(screen.getByLabelText('Go to next page')).toBeDisabled();
      expect(screen.getByLabelText('Go to last page')).toBeDisabled();
      expect(screen.getByLabelText('Page:')).toBeDisabled();
    });
  });

  describe('Button Navigation', () => {
    it('calls onPageChange with previous page when previous button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      await user.click(screen.getByLabelText('Go to previous page'));
      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('calls onPageChange with next page when next button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      await user.click(screen.getByLabelText('Go to next page'));
      expect(mockOnPageChange).toHaveBeenCalledWith(6);
    });

    it('calls onPageChange with first page when first button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={50}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      await user.click(screen.getByLabelText('Go to first page'));
      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange with last page when last button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={50}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      await user.click(screen.getByLabelText('Go to last page'));
      expect(mockOnPageChange).toHaveBeenCalledWith(100);
    });
  });

  describe('Page Input Field', () => {
    it('updates input value when typing', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText('Page:');
      await user.clear(input);
      await user.type(input, '25');
      
      expect(input).toHaveValue('25');
    });

    it('calls onPageChange with valid page number on form submit', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText('Page:');
      await user.clear(input);
      await user.type(input, '25');
      await user.keyboard('{Enter}');
      
      expect(mockOnPageChange).toHaveBeenCalledWith(25);
    });

    it('shows error for invalid page numbers', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText('Page:');
      
      // Test page number too high
      await user.clear(input);
      await user.type(input, '150');
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('Page number cannot exceed 100')).toBeInTheDocument();
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('shows error for page number less than 1', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText('Page:');
      
      await user.clear(input);
      await user.type(input, '0');
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('Page number must be at least 1')).toBeInTheDocument();
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('shows error for non-numeric input', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText('Page:');
      
      await user.clear(input);
      await user.type(input, 'abc');
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('Please enter a valid number')).toBeInTheDocument();
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('resets input to current page on blur with invalid value', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText('Page:');
      
      await user.clear(input);
      await user.type(input, 'invalid');
      await user.tab(); // Trigger blur
      
      await waitFor(() => {
        expect(input).toHaveValue('5');
      });
    });

    it('updates input value when currentPage prop changes', () => {
      const { rerender } = render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByDisplayValue('5')).toBeInTheDocument();

      rerender(
        <NavigationControlsWithTheme
          currentPage={10}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('navigates to previous page on ArrowLeft key', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('navigates to next page on ArrowRight key', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.keyDown(document, { key: 'ArrowRight' });
      expect(mockOnPageChange).toHaveBeenCalledWith(6);
    });

    it('navigates to previous page on PageUp key', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.keyDown(document, { key: 'PageUp' });
      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('navigates to next page on PageDown key', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.keyDown(document, { key: 'PageDown' });
      expect(mockOnPageChange).toHaveBeenCalledWith(6);
    });

    it('navigates to first page on Home key', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={50}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.keyDown(document, { key: 'Home' });
      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('navigates to last page on End key', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={50}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.keyDown(document, { key: 'End' });
      expect(mockOnPageChange).toHaveBeenCalledWith(100);
    });

    it('does not navigate when on first page and pressing previous keys', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={1}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      fireEvent.keyDown(document, { key: 'PageUp' });
      
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('does not navigate when on last page and pressing next keys', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={100}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.keyDown(document, { key: 'ArrowRight' });
      fireEvent.keyDown(document, { key: 'PageDown' });
      
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('does not handle keyboard shortcuts when disabled', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={50}
          totalPages={100}
          onPageChange={mockOnPageChange}
          disabled={true}
        />
      );

      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      fireEvent.keyDown(document, { key: 'Home' });
      fireEvent.keyDown(document, { key: 'End' });
      
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('does not handle keyboard shortcuts when input is focused', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={50}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText('Page:');
      await user.click(input);

      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Progress Indicator', () => {
    it('calculates progress percentage correctly', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={25}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      expect(progressBar).toHaveAttribute('aria-valuemin', '1');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('handles edge case with single page', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText('1 of 1 pages')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '1');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Page navigation');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Reading progress: page 5 of 100');
      expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
    });

    it('shows error message with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText('Page:');
      await user.clear(input);
      await user.type(input, '150');
      await user.keyboard('{Enter}');
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Page number cannot exceed 100');
      expect(input).toHaveAttribute('aria-describedby', 'page-input-error');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero total pages gracefully', () => {
      render(
        <NavigationControlsWithTheme
          currentPage={1}
          totalPages={0}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText('1 of 0 pages')).toBeInTheDocument();
    });

    it('does not call onPageChange when navigating to same page', async () => {
      const user = userEvent.setup();
      render(
        <NavigationControlsWithTheme
          currentPage={5}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText('Page:');
      await user.clear(input);
      await user.type(input, '5');
      await user.keyboard('{Enter}');
      
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });
  });
});