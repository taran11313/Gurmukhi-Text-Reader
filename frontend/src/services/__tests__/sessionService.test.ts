import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionService, sessionService } from '../sessionService';

// Mock fetch
global.fetch = vi.fn();

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService('/api');
    vi.clearAllMocks();
  });

  describe('getNavigationMetadata', () => {
    it('should fetch navigation metadata without session ID', async () => {
      const mockResponse = {
        navigation: {
          totalPages: 10000,
          currentPage: 1,
          bookmarks: [],
          hasSession: false,
          sessionId: null,
          processing: {
            isComplete: true,
            processedPages: 10000,
            totalPages: 10000
          },
          limits: {
            minPage: 1,
            maxPage: 10000
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.getNavigationMetadata();

      expect(global.fetch).toHaveBeenCalledWith('/api/navigation', {
        headers: {}
      });
      expect(result.totalPages).toBe(10000);
      expect(result.hasSession).toBe(false);
    });

    it('should fetch navigation metadata with session ID', async () => {
      const mockResponse = {
        navigation: {
          totalPages: 10000,
          currentPage: 5,
          bookmarks: [1, 10, 20],
          hasSession: true,
          sessionId: 'test-session-id',
          processing: {
            isComplete: true,
            processedPages: 10000,
            totalPages: 10000
          },
          limits: {
            minPage: 1,
            maxPage: 10000
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.getNavigationMetadata('test-session-id');

      expect(global.fetch).toHaveBeenCalledWith('/api/navigation', {
        headers: {
          'X-Session-ID': 'test-session-id'
        }
      });
      expect(result.currentPage).toBe(5);
      expect(result.bookmarks).toEqual([1, 10, 20]);
    });

    it('should handle fetch errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' })
      });

      await expect(service.getNavigationMetadata()).rejects.toThrow('Server error');
    });
  });

  describe('saveSession', () => {
    it('should save session data', async () => {
      const sessionData = {
        sessionId: 'test-session-id',
        currentPage: 5,
        bookmarks: [1, 10, 20],
        lastVisited: new Date()
      };

      const mockResponse = {
        session: {
          ...sessionData,
          lastVisited: sessionData.lastVisited.toISOString()
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.saveSession(sessionData);

      expect(global.fetch).toHaveBeenCalledWith('/api/navigation/bookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session-id'
        },
        body: JSON.stringify({
          currentPage: 5,
          bookmarks: [1, 10, 20],
          sessionId: 'test-session-id'
        })
      });

      expect(result.sessionId).toBe('test-session-id');
      expect(result.currentPage).toBe(5);
      expect(result.bookmarks).toEqual([1, 10, 20]);
      expect(result.lastVisited).toBeInstanceOf(Date);
    });

    it('should save partial session data', async () => {
      const sessionData = {
        currentPage: 10
      };

      const mockResponse = {
        session: {
          sessionId: 'new-session-id',
          currentPage: 10,
          bookmarks: [],
          lastVisited: new Date().toISOString()
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.saveSession(sessionData);

      expect(global.fetch).toHaveBeenCalledWith('/api/navigation/bookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPage: 10,
          bookmarks: undefined,
          sessionId: undefined
        })
      });

      expect(result.currentPage).toBe(10);
    });

    it('should handle save errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Save failed' })
      });

      await expect(service.saveSession({ currentPage: 1 })).rejects.toThrow('Save failed');
    });
  });

  describe('loadSession', () => {
    it('should load session by ID', async () => {
      const mockResponse = {
        session: {
          sessionId: 'test-session-id',
          currentPage: 15,
          bookmarks: [5, 10, 15],
          lastVisited: new Date().toISOString()
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.loadSession('test-session-id');

      expect(global.fetch).toHaveBeenCalledWith('/api/navigation/session/test-session-id', {
        headers: {
          'X-Session-ID': 'test-session-id'
        }
      });

      expect(result.sessionId).toBe('test-session-id');
      expect(result.currentPage).toBe(15);
      expect(result.bookmarks).toEqual([5, 10, 15]);
      expect(result.lastVisited).toBeInstanceOf(Date);
    });

    it('should handle load errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Session not found' })
      });

      await expect(service.loadSession('non-existent')).rejects.toThrow('Session not found');
    });
  });

  describe('deleteSession', () => {
    it('should delete session by ID', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await service.deleteSession('test-session-id');

      expect(global.fetch).toHaveBeenCalledWith('/api/navigation/session/test-session-id', {
        method: 'DELETE',
        headers: {
          'X-Session-ID': 'test-session-id'
        }
      });
    });

    it('should handle delete errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Delete failed' })
      });

      await expect(service.deleteSession('test-session-id')).rejects.toThrow('Delete failed');
    });
  });

  describe('autoSaveSession', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto-save with debouncing', async () => {
      const sessionData = { currentPage: 5 };
      const mockResponse = {
        session: {
          sessionId: 'test-session-id',
          currentPage: 5,
          bookmarks: [],
          lastVisited: new Date().toISOString()
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const savePromise = service.autoSaveSession(sessionData, 1000);

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      const result = await savePromise;

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.currentPage).toBe(5);
    });

    it('should cancel previous auto-save when called again', async () => {
      const sessionData1 = { currentPage: 5 };
      const sessionData2 = { currentPage: 10 };

      const mockResponse = {
        session: {
          sessionId: 'test-session-id',
          currentPage: 10,
          bookmarks: [],
          lastVisited: new Date().toISOString()
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Start first auto-save
      service.autoSaveSession(sessionData1, 1000);

      // Start second auto-save before first completes
      const savePromise = service.autoSaveSession(sessionData2, 1000);

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      await savePromise;

      // Should only have called fetch once (for the second save)
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/navigation/bookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPage: 10,
          bookmarks: undefined,
          sessionId: undefined
        })
      });
    });

    it('should handle auto-save errors', async () => {
      const sessionData = { currentPage: 5 };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Auto-save failed' })
      });

      const savePromise = service.autoSaveSession(sessionData, 1000);

      vi.advanceTimersByTime(1000);

      await expect(savePromise).rejects.toThrow('Auto-save failed');
    });
  });

  describe('cancelAutoSave', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cancel pending auto-save', () => {
      const sessionData = { currentPage: 5 };

      service.autoSaveSession(sessionData, 1000);
      service.cancelAutoSave();

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      // Should not have called fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(sessionService).toBeInstanceOf(SessionService);
    });
  });
});