import { useState, useEffect, useCallback } from 'react';

export interface SessionState {
  currentPage: number;
  bookmarks: number[];
  sessionId: string | null;
  lastVisited: Date | null;
}

export interface UseSessionStateReturn {
  sessionState: SessionState;
  updateCurrentPage: (page: number) => void;
  addBookmark: (page: number) => void;
  removeBookmark: (page: number) => void;
  toggleBookmark: (page: number) => void;
  clearBookmarks: () => void;
  isBookmarked: (page: number) => boolean;
  saveToServer: () => Promise<void>;
  loadFromServer: (sessionId?: string) => Promise<void>;
  clearSession: () => void;
}

const STORAGE_KEY = 'punjabi-reader-session';
const SESSION_ID_KEY = 'punjabi-reader-session-id';

// Generate a simple session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Local storage helpers
const saveToLocalStorage = (state: SessionState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      lastVisited: state.lastVisited?.toISOString()
    }));
    if (state.sessionId) {
      localStorage.setItem(SESSION_ID_KEY, state.sessionId);
    }
  } catch (error) {
    console.warn('Failed to save session to localStorage:', error);
  }
};

const loadFromLocalStorage = (): SessionState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const sessionId = localStorage.getItem(SESSION_ID_KEY);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        sessionId: sessionId || parsed.sessionId,
        lastVisited: parsed.lastVisited ? new Date(parsed.lastVisited) : null
      };
    }
  } catch (error) {
    console.warn('Failed to load session from localStorage:', error);
  }
  return null;
};

const clearLocalStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
  } catch (error) {
    console.warn('Failed to clear session from localStorage:', error);
  }
};

export const useSessionState = (initialPage: number = 1): UseSessionStateReturn => {
  const [sessionState, setSessionState] = useState<SessionState>(() => {
    // Try to load from localStorage on initialization
    const stored = loadFromLocalStorage();
    if (stored) {
      return stored;
    }
    
    // Create new session state
    return {
      currentPage: initialPage,
      bookmarks: [],
      sessionId: generateSessionId(),
      lastVisited: new Date()
    };
  });

  const [isClearing, setIsClearing] = useState(false);

  // Save to localStorage whenever session state changes (unless we're clearing)
  useEffect(() => {
    if (!isClearing) {
      saveToLocalStorage(sessionState);
    }
  }, [sessionState, isClearing]);

  // Update current page
  const updateCurrentPage = useCallback((page: number) => {
    setSessionState(prev => ({
      ...prev,
      currentPage: page,
      lastVisited: new Date()
    }));
  }, []);

  // Add bookmark
  const addBookmark = useCallback((page: number) => {
    setSessionState(prev => {
      if (prev.bookmarks.includes(page)) {
        return prev; // Already bookmarked
      }
      return {
        ...prev,
        bookmarks: [...prev.bookmarks, page].sort((a, b) => a - b),
        lastVisited: new Date()
      };
    });
  }, []);

  // Remove bookmark
  const removeBookmark = useCallback((page: number) => {
    setSessionState(prev => ({
      ...prev,
      bookmarks: prev.bookmarks.filter(b => b !== page),
      lastVisited: new Date()
    }));
  }, []);

  // Toggle bookmark
  const toggleBookmark = useCallback((page: number) => {
    setSessionState(prev => {
      const isBookmarked = prev.bookmarks.includes(page);
      const newBookmarks = isBookmarked
        ? prev.bookmarks.filter(b => b !== page)
        : [...prev.bookmarks, page].sort((a, b) => a - b);
      
      return {
        ...prev,
        bookmarks: newBookmarks,
        lastVisited: new Date()
      };
    });
  }, []);

  // Clear all bookmarks
  const clearBookmarks = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      bookmarks: [],
      lastVisited: new Date()
    }));
  }, []);

  // Check if page is bookmarked
  const isBookmarked = useCallback((page: number): boolean => {
    return sessionState.bookmarks.includes(page);
  }, [sessionState.bookmarks]);

  // Save session to server
  const saveToServer = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/navigation/bookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionState.sessionId || ''
        },
        body: JSON.stringify({
          currentPage: sessionState.currentPage,
          bookmarks: sessionState.bookmarks,
          sessionId: sessionState.sessionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save session to server');
      }

      const data = await response.json();
      
      // Update session ID if server provided a new one
      if (data.session?.sessionId && data.session.sessionId !== sessionState.sessionId) {
        setSessionState(prev => ({
          ...prev,
          sessionId: data.session.sessionId,
          lastVisited: new Date()
        }));
      }
    } catch (error) {
      console.error('Failed to save session to server:', error);
      throw error;
    }
  }, [sessionState]);

  // Load session from server
  const loadFromServer = useCallback(async (sessionId?: string): Promise<void> => {
    try {
      const targetSessionId = sessionId || sessionState.sessionId;
      if (!targetSessionId) {
        throw new Error('No session ID available');
      }

      const response = await fetch(`/api/navigation/session/${targetSessionId}`, {
        headers: {
          'X-Session-ID': targetSessionId
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Session not found on server, keep local state
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load session from server');
      }

      const data = await response.json();
      
      if (data.session) {
        setSessionState(prev => ({
          ...prev,
          currentPage: data.session.currentPage || prev.currentPage,
          bookmarks: data.session.bookmarks || [],
          sessionId: data.session.sessionId,
          lastVisited: data.session.lastVisited ? new Date(data.session.lastVisited) : new Date()
        }));
      }
    } catch (error) {
      console.error('Failed to load session from server:', error);
      throw error;
    }
  }, [sessionState.sessionId]);

  // Clear session
  const clearSession = useCallback(() => {
    setIsClearing(true);
    clearLocalStorage();
    const newSessionState: SessionState = {
      currentPage: initialPage,
      bookmarks: [],
      sessionId: generateSessionId(),
      lastVisited: new Date()
    };
    
    setSessionState(newSessionState);
    // Keep isClearing true to prevent saving the new state
    setTimeout(() => setIsClearing(false), 0);
  }, [initialPage]);

  return {
    sessionState,
    updateCurrentPage,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    clearBookmarks,
    isBookmarked,
    saveToServer,
    loadFromServer,
    clearSession
  };
};