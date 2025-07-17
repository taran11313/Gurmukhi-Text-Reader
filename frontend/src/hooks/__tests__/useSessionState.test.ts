import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionState } from '../useSessionState';

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

describe('useSessionState', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values when no stored session exists', () => {
      const { result } = renderHook(() => useSessionState(1));

      expect(result.current.sessionState.currentPage).toBe(1);
      expect(result.current.sessionState.bookmarks).toEqual([]);
      expect(result.current.sessionState.sessionId).toBeTruthy();
      expect(result.current.sessionState.lastVisited).toBeInstanceOf(Date);
    });

    it('should initialize with custom initial page', () => {
      const { result } = renderHook(() => useSessionState(5));

      expect(result.current.sessionState.currentPage).toBe(5);
    });

    it('should load from localStorage if available', () => {
      const storedSession = {
        currentPage: 10,
        bookmarks: [5, 15, 25],
        sessionId: 'test-session-id',
        lastVisited: new Date('2023-01-01').toISOString()
      };
      
      localStorageMock.setItem('punjabi-reader-session', JSON.stringify(storedSession));
      localStorageMock.setItem('punjabi-reader-session-id', 'test-session-id');

      const { result } = renderHook(() => useSessionState(1));

      expect(result.current.sessionState.currentPage).toBe(10);
      expect(result.current.sessionState.bookmarks).toEqual([5, 15, 25]);
      expect(result.current.sessionState.sessionId).toBe('test-session-id');
      expect(result.current.sessionState.lastVisited).toEqual(new Date('2023-01-01'));
    });
  });

  describe('page management', () => {
    it('should update current page', () => {
      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.updateCurrentPage(5);
      });

      expect(result.current.sessionState.currentPage).toBe(5);
      expect(result.current.sessionState.lastVisited).toBeInstanceOf(Date);
    });

    it('should save to localStorage when page changes', () => {
      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.updateCurrentPage(5);
      });

      const stored = JSON.parse(localStorageMock.getItem('punjabi-reader-session') || '{}');
      expect(stored.currentPage).toBe(5);
    });
  });

  describe('bookmark management', () => {
    it('should add bookmark', () => {
      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.addBookmark(10);
      });

      expect(result.current.sessionState.bookmarks).toContain(10);
      expect(result.current.isBookmarked(10)).toBe(true);
    });

    it('should not add duplicate bookmarks', () => {
      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.addBookmark(10);
        result.current.addBookmark(10);
      });

      expect(result.current.sessionState.bookmarks).toEqual([10]);
    });

    it('should remove bookmark', () => {
      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.addBookmark(10);
        result.current.addBookmark(20);
      });

      expect(result.current.sessionState.bookmarks).toEqual([10, 20]);

      act(() => {
        result.current.removeBookmark(10);
      });

      expect(result.current.sessionState.bookmarks).toEqual([20]);
      expect(result.current.isBookmarked(10)).toBe(false);
    });

    it('should toggle bookmark', () => {
      const { result } = renderHook(() => useSessionState(1));

      // Toggle on
      act(() => {
        result.current.toggleBookmark(10);
      });

      expect(result.current.sessionState.bookmarks).toContain(10);

      // Toggle off
      act(() => {
        result.current.toggleBookmark(10);
      });

      expect(result.current.sessionState.bookmarks).not.toContain(10);
    });

    it('should clear all bookmarks', () => {
      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.addBookmark(10);
        result.current.addBookmark(20);
        result.current.addBookmark(30);
      });

      expect(result.current.sessionState.bookmarks).toEqual([10, 20, 30]);

      act(() => {
        result.current.clearBookmarks();
      });

      expect(result.current.sessionState.bookmarks).toEqual([]);
    });

    it('should keep bookmarks sorted', () => {
      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.addBookmark(30);
        result.current.addBookmark(10);
        result.current.addBookmark(20);
      });

      expect(result.current.sessionState.bookmarks).toEqual([10, 20, 30]);
    });
  });

  describe('server integration', () => {
    it('should save session to server', async () => {
      const mockResponse = {
        success: true,
        session: {
          sessionId: 'server-session-id',
          currentPage: 5,
          bookmarks: [10, 20],
          lastVisited: new Date().toISOString()
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.updateCurrentPage(5);
        result.current.addBookmark(10);
      });

      await act(async () => {
        await result.current.saveToServer();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/navigation/bookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': expect.any(String)
        },
        body: expect.stringContaining('"currentPage":5')
      });
    });

    it('should handle server save errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' })
      });

      const { result } = renderHook(() => useSessionState(1));

      await expect(
        act(async () => {
          await result.current.saveToServer();
        })
      ).rejects.toThrow('Server error');
    });

    it('should load session from server', async () => {
      const mockResponse = {
        success: true,
        session: {
          sessionId: 'server-session-id',
          currentPage: 15,
          bookmarks: [5, 10, 15],
          lastVisited: new Date().toISOString()
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useSessionState(1));
      const originalSessionId = result.current.sessionState.sessionId;

      await act(async () => {
        await result.current.loadFromServer(originalSessionId);
      });

      expect(result.current.sessionState.currentPage).toBe(15);
      expect(result.current.sessionState.bookmarks).toEqual([5, 10, 15]);
      expect(result.current.sessionState.sessionId).toBe('server-session-id');
    });

    it('should handle server load errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Session not found' })
      });

      const { result } = renderHook(() => useSessionState(1));
      const originalState = { ...result.current.sessionState };

      // Should not throw error for 404, just return silently
      await act(async () => {
        await result.current.loadFromServer('non-existent-session');
      });

      // State should remain unchanged
      expect(result.current.sessionState.currentPage).toBe(originalState.currentPage);
    });

    it('should handle server load errors for non-404 status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' })
      });

      const { result } = renderHook(() => useSessionState(1));

      await expect(
        act(async () => {
          await result.current.loadFromServer('test-session');
        })
      ).rejects.toThrow('Server error');
    });
  });

  describe('session management', () => {
    it('should clear session', () => {
      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.updateCurrentPage(10);
        result.current.addBookmark(5);
        result.current.addBookmark(15);
      });

      expect(result.current.sessionState.currentPage).toBe(10);
      expect(result.current.sessionState.bookmarks).toEqual([5, 15]);

      act(() => {
        result.current.clearSession();
      });

      expect(result.current.sessionState.currentPage).toBe(1);
      expect(result.current.sessionState.bookmarks).toEqual([]);
      expect(result.current.sessionState.sessionId).toBeTruthy();
      expect(localStorageMock.getItem('punjabi-reader-session')).toBeNull();
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useSessionState(1));

      act(() => {
        result.current.updateCurrentPage(5);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save session to localStorage:',
        expect.any(Error)
      );

      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });
});