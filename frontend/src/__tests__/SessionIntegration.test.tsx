import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
global.fetch = vi.fn();

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(() => true)
});

describe('Session State Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/navigation/bookmark')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            session: {
              sessionId: 'test-session-id',
              currentPage: options?.body ? JSON.parse(options.body).currentPage : 1,
              bookmarks: options?.body ? JSON.parse(options.body).bookmarks || [] : [],
              lastVisited: new Date().toISOString()
            }
          })
        });
      }
      
      if (url.includes('/api/navigation/session/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            session: {
              sessionId: 'test-session-id',
              currentPage: 5,
              bookmarks: [1, 10, 20],
              lastVisited: new Date().toISOString()
            }
          })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
  });

  describe('page navigation with session persistence', () => {
    it('should persist current page to localStorage', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Navigate to page 5
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      
      for (let i = 0; i < 4; i++) {
        await user.click(nextButton);
      }
      
      // Check localStorage
      const stored = JSON.parse(localStorageMock.getItem('punjabi-reader-session') || '{}');
      expect(stored.currentPage).toBe(5);
    });

    it('should restore current page from localStorage on app reload', () => {
      // Pre-populate localStorage
      const sessionData = {
        currentPage: 10,
        bookmarks: [5, 15],
        sessionId: 'existing-session-id',
        lastVisited: new Date().toISOString()
      };
      
      localStorageMock.setItem('punjabi-reader-session', JSON.stringify(sessionData));
      localStorageMock.setItem('punjabi-reader-session-id', 'existing-session-id');
      
      render(<App />);
      
      // Should show page 10
      expect(screen.getByText('Page 10 of 10000')).toBeInTheDocument();
    });

    it('should navigate using page input and persist state', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const pageInput = screen.getByLabelText(/page:/i);
      
      // Navigate to page 25
      await user.clear(pageInput);
      await user.type(pageInput, '25');
      await user.keyboard('{Enter}');
      
      // Check that page changed
      expect(screen.getByText('Page 25 of 10000')).toBeInTheDocument();
      
      // Check localStorage
      await waitFor(() => {
        const stored = JSON.parse(localStorageMock.getItem('punjabi-reader-session') || '{}');
        expect(stored.currentPage).toBe(25);
      });
    });
  });

  describe('bookmark functionality with session persistence', () => {
    it('should add and persist bookmarks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Add bookmark to current page (page 1)
      const bookmarkToggle = screen.getByRole('button', { name: /add bookmark to current page/i });
      await user.click(bookmarkToggle);
      
      // Check that bookmark was added
      expect(screen.getByText('Bookmarks (1)')).toBeInTheDocument();
      
      // Check localStorage
      await waitFor(() => {
        const stored = JSON.parse(localStorageMock.getItem('punjabi-reader-session') || '{}');
        expect(stored.bookmarks).toContain(1);
      });
    });

    it('should navigate to bookmarked pages', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Navigate to page 5 and bookmark it
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      for (let i = 0; i < 4; i++) {
        await user.click(nextButton);
      }
      
      const bookmarkToggle = screen.getByRole('button', { name: /add bookmark to current page/i });
      await user.click(bookmarkToggle);
      
      // Navigate to page 10
      for (let i = 0; i < 5; i++) {
        await user.click(nextButton);
      }
      
      expect(screen.getByText('Page 10 of 10000')).toBeInTheDocument();
      
      // Open bookmarks and navigate to page 5
      const bookmarksButton = screen.getByRole('button', { name: /show bookmarks list/i });
      await user.click(bookmarksButton);
      
      const page5Button = screen.getByTitle('Go to page 5');
      await user.click(page5Button);
      
      // Should be on page 5
      expect(screen.getByText('Page 5 of 10000')).toBeInTheDocument();
    });

    it('should remove bookmarks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Add bookmark
      const bookmarkToggle = screen.getByRole('button', { name: /add bookmark to current page/i });
      await user.click(bookmarkToggle);
      
      expect(screen.getByText('Bookmarks (1)')).toBeInTheDocument();
      
      // Remove bookmark
      await user.click(bookmarkToggle);
      
      // Bookmarks list should be hidden (no bookmarks)
      expect(screen.queryByText('Bookmarks (1)')).not.toBeInTheDocument();
    });

    it('should clear all bookmarks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Add multiple bookmarks
      const bookmarkToggle = screen.getByRole('button', { name: /add bookmark to current page/i });
      await user.click(bookmarkToggle);
      
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await user.click(nextButton);
      await user.click(bookmarkToggle);
      
      await user.click(nextButton);
      await user.click(bookmarkToggle);
      
      expect(screen.getByText('Bookmarks (3)')).toBeInTheDocument();
      
      // Open bookmarks and clear all
      const bookmarksButton = screen.getByRole('button', { name: /show bookmarks list/i });
      await user.click(bookmarksButton);
      
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);
      
      // Bookmarks should be cleared
      expect(screen.queryByText('Bookmarks')).not.toBeInTheDocument();
    });
  });

  describe('server synchronization', () => {
    it('should auto-save session to server', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Navigate to page 5
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      for (let i = 0; i < 4; i++) {
        await user.click(nextButton);
      }
      
      // Add bookmark
      const bookmarkToggle = screen.getByRole('button', { name: /add bookmark to current page/i });
      await user.click(bookmarkToggle);
      
      // Wait for auto-save to trigger
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/navigation/bookmark', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': expect.any(String)
          },
          body: expect.stringContaining('"currentPage":5')
        });
      }, { timeout: 3000 });
    });

    it('should handle server errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock server error
      (global.fetch as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Server error' })
        })
      );
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(<App />);
      
      // Navigate to trigger auto-save
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await user.click(nextButton);
      
      // Should continue working despite server error
      expect(screen.getByText('Page 2 of 10000')).toBeInTheDocument();
      
      // Should log warning (the error comes from the loadFromServer call, not auto-save)
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load session from server:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('keyboard navigation with session persistence', () => {
    it('should persist page changes from keyboard navigation', async () => {
      render(<App />);
      
      // Use arrow key to navigate
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      
      expect(screen.getByText('Page 4 of 10000')).toBeInTheDocument();
      
      // Check localStorage
      await waitFor(() => {
        const stored = JSON.parse(localStorageMock.getItem('punjabi-reader-session') || '{}');
        expect(stored.currentPage).toBe(4);
      });
    });

    it('should navigate to first/last page and persist', async () => {
      render(<App />);
      
      // Navigate to last page
      fireEvent.keyDown(document, { key: 'End' });
      
      expect(screen.getByText('Page 10000 of 10000')).toBeInTheDocument();
      
      // Navigate to first page
      fireEvent.keyDown(document, { key: 'Home' });
      
      expect(screen.getByText('Page 1 of 10000')).toBeInTheDocument();
      
      // Check localStorage
      await waitFor(() => {
        const stored = JSON.parse(localStorageMock.getItem('punjabi-reader-session') || '{}');
        expect(stored.currentPage).toBe(1);
      });
    });
  });

  describe('session restoration on browser refresh', () => {
    it('should maintain session state across app reloads', () => {
      // Simulate existing session
      const sessionData = {
        currentPage: 42,
        bookmarks: [10, 20, 30, 42],
        sessionId: 'persistent-session-id',
        lastVisited: new Date().toISOString()
      };
      
      localStorageMock.setItem('punjabi-reader-session', JSON.stringify(sessionData));
      localStorageMock.setItem('punjabi-reader-session-id', 'persistent-session-id');
      
      render(<App />);
      
      // Should restore page
      expect(screen.getByText('Page 42 of 10000')).toBeInTheDocument();
      
      // Should restore bookmarks
      expect(screen.getByText('Bookmarks (4)')).toBeInTheDocument();
      
      // Current page should be marked as bookmarked
      const bookmarkToggle = screen.getByRole('button', { name: /remove bookmark from current page/i });
      expect(bookmarkToggle).toHaveTextContent('★');
    });
  });
});