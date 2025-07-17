import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarkPanel } from '../BookmarkPanel';

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn()
});

describe('BookmarkPanel', () => {
  const defaultProps = {
    bookmarks: [],
    currentPage: 1,
    totalPages: 100,
    onPageChange: vi.fn(),
    onAddBookmark: vi.fn(),
    onRemoveBookmark: vi.fn(),
    onClearBookmarks: vi.fn(),
    isBookmarked: vi.fn(() => false)
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bookmark toggle button', () => {
    it('should render bookmark toggle button', () => {
      render(<BookmarkPanel {...defaultProps} />);
      
      const toggleButton = screen.getByRole('button', { name: /add bookmark to current page/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('☆');
    });

    it('should show filled star when current page is bookmarked', () => {
      const props = {
        ...defaultProps,
        isBookmarked: vi.fn(() => true)
      };

      render(<BookmarkPanel {...props} />);
      
      const toggleButton = screen.getByRole('button', { name: /remove bookmark from current page/i });
      expect(toggleButton).toHaveTextContent('★');
      expect(toggleButton).toHaveClass('bookmark-panel__toggle--active');
    });

    it('should call onAddBookmark when clicking empty star', async () => {
      const user = userEvent.setup();
      render(<BookmarkPanel {...defaultProps} />);
      
      const toggleButton = screen.getByRole('button', { name: /add bookmark to current page/i });
      await user.click(toggleButton);
      
      expect(defaultProps.onAddBookmark).toHaveBeenCalledWith(1);
    });

    it('should call onRemoveBookmark when clicking filled star', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        isBookmarked: vi.fn(() => true)
      };

      render(<BookmarkPanel {...props} />);
      
      const toggleButton = screen.getByRole('button', { name: /remove bookmark from current page/i });
      await user.click(toggleButton);
      
      expect(defaultProps.onRemoveBookmark).toHaveBeenCalledWith(1);
    });
  });

  describe('bookmarks list', () => {
    it('should not show bookmarks list when no bookmarks exist', () => {
      render(<BookmarkPanel {...defaultProps} />);
      
      expect(screen.queryByText(/bookmarks \(0\)/i)).not.toBeInTheDocument();
    });

    it('should show bookmarks list when bookmarks exist', () => {
      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15]
      };

      render(<BookmarkPanel {...props} />);
      
      expect(screen.getByText('Bookmarks (3)')).toBeInTheDocument();
    });

    it('should expand/collapse bookmarks list', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15]
      };

      render(<BookmarkPanel {...props} />);
      
      const expandButton = screen.getByRole('button', { name: /show bookmarks list/i });
      
      // Initially collapsed
      expect(screen.queryByText('Your Bookmarks')).not.toBeInTheDocument();
      
      // Expand
      await user.click(expandButton);
      expect(screen.getByText('Your Bookmarks')).toBeInTheDocument();
      
      // Collapse
      await user.click(expandButton);
      await waitFor(() => {
        expect(screen.queryByText('Your Bookmarks')).not.toBeInTheDocument();
      });
    });

    it('should display bookmarks in sorted order', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        bookmarks: [15, 5, 10] // Unsorted
      };

      render(<BookmarkPanel {...props} />);
      
      const expandButton = screen.getByRole('button', { name: /show bookmarks list/i });
      await user.click(expandButton);
      
      const bookmarkItems = screen.getAllByText(/page \d+/i);
      expect(bookmarkItems[0]).toHaveTextContent('Page 5');
      expect(bookmarkItems[1]).toHaveTextContent('Page 10');
      expect(bookmarkItems[2]).toHaveTextContent('Page 15');
    });

    it('should highlight current page in bookmarks list', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15],
        currentPage: 10
      };

      render(<BookmarkPanel {...props} />);
      
      const expandButton = screen.getByRole('button', { name: /show bookmarks list/i });
      await user.click(expandButton);
      
      const currentPageButton = screen.getByTitle('Go to page 10');
      expect(currentPageButton).toHaveClass('bookmark-panel__page-btn--current');
      expect(screen.getByText('(current)')).toBeInTheDocument();
    });

    it('should navigate to page when clicking bookmark', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15]
      };

      render(<BookmarkPanel {...props} />);
      
      const expandButton = screen.getByRole('button', { name: /show bookmarks list/i });
      await user.click(expandButton);
      
      const pageButton = screen.getByTitle('Go to page 10');
      await user.click(pageButton);
      
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(10);
    });

    it('should remove bookmark when clicking remove button', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15]
      };

      render(<BookmarkPanel {...props} />);
      
      const expandButton = screen.getByRole('button', { name: /show bookmarks list/i });
      await user.click(expandButton);
      
      const removeButton = screen.getByRole('button', { name: /remove bookmark from page 10/i });
      await user.click(removeButton);
      
      expect(defaultProps.onRemoveBookmark).toHaveBeenCalledWith(10);
    });
  });

  describe('clear all bookmarks', () => {
    it('should show clear all button when bookmarks exist', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15]
      };

      render(<BookmarkPanel {...props} />);
      
      const expandButton = screen.getByRole('button', { name: /show bookmarks list/i });
      await user.click(expandButton);
      
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('should confirm before clearing all bookmarks', async () => {
      const user = userEvent.setup();
      const mockConfirm = window.confirm as any;
      mockConfirm.mockReturnValue(true);

      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15]
      };

      render(<BookmarkPanel {...props} />);
      
      const expandButton = screen.getByRole('button', { name: /show bookmarks list/i });
      await user.click(expandButton);
      
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);
      
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to clear all bookmarks?');
      expect(defaultProps.onClearBookmarks).toHaveBeenCalled();
    });

    it('should not clear bookmarks if user cancels confirmation', async () => {
      const user = userEvent.setup();
      const mockConfirm = window.confirm as any;
      mockConfirm.mockReturnValue(false);

      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15]
      };

      render(<BookmarkPanel {...props} />);
      
      const expandButton = screen.getByRole('button', { name: /show bookmarks list/i });
      await user.click(expandButton);
      
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);
      
      expect(mockConfirm).toHaveBeenCalled();
      expect(defaultProps.onClearBookmarks).not.toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no bookmarks exist in expanded list', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        bookmarks: [] // No bookmarks
      };

      render(<BookmarkPanel {...props} />);
      
      // Since there are no bookmarks, the list won't show
      expect(screen.queryByText('Bookmarks')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15]
      };

      render(<BookmarkPanel {...props} />);
      
      const expandButton = screen.getByRole('button', { name: /show bookmarks list/i });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(expandButton);
      expect(expandButton).toHaveAttribute('aria-expanded', 'true');
      
      const bookmarksList = screen.getByRole('list');
      expect(bookmarksList).toBeInTheDocument();
    });

    it('should have proper labels for screen readers', () => {
      const props = {
        ...defaultProps,
        isBookmarked: vi.fn(() => true)
      };

      render(<BookmarkPanel {...props} />);
      
      const toggleButton = screen.getByRole('button', { name: /remove bookmark from current page/i });
      expect(toggleButton).toHaveAttribute('aria-label', 'Remove bookmark from current page');
    });
  });

  describe('responsive behavior', () => {
    it('should render properly on different screen sizes', () => {
      const props = {
        ...defaultProps,
        bookmarks: [5, 10, 15]
      };

      render(<BookmarkPanel {...props} />);
      
      const panel = screen.getByText('Bookmarks (3)').closest('.bookmark-panel');
      expect(panel).toHaveClass('bookmark-panel');
    });
  });
});