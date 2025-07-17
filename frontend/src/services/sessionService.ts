export interface SessionData {
  sessionId: string;
  currentPage: number;
  bookmarks: number[];
  lastVisited: Date;
}

export interface NavigationMetadata {
  totalPages: number;
  currentPage: number;
  bookmarks: number[];
  hasSession: boolean;
  sessionId: string | null;
  processing: {
    isComplete: boolean;
    processedPages: number;
    totalPages: number;
  };
  limits: {
    minPage: number;
    maxPage: number;
  };
}

export class SessionService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get navigation metadata including session information
   */
  async getNavigationMetadata(sessionId?: string): Promise<NavigationMetadata> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }

    const response = await fetch(`${this.baseUrl}/navigation`, {
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get navigation metadata');
    }

    const data = await response.json();
    return {
      ...data.navigation,
      lastVisited: data.navigation.lastVisited ? new Date(data.navigation.lastVisited) : new Date()
    };
  }

  /**
   * Save session state to server
   */
  async saveSession(sessionData: Partial<SessionData>): Promise<SessionData> {
    const response = await fetch(`${this.baseUrl}/navigation/bookmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionData.sessionId && { 'X-Session-ID': sessionData.sessionId })
      },
      body: JSON.stringify({
        currentPage: sessionData.currentPage,
        bookmarks: sessionData.bookmarks,
        sessionId: sessionData.sessionId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save session');
    }

    const data = await response.json();
    return {
      ...data.session,
      lastVisited: new Date(data.session.lastVisited)
    };
  }

  /**
   * Load session from server
   */
  async loadSession(sessionId: string): Promise<SessionData> {
    const response = await fetch(`${this.baseUrl}/navigation/session/${sessionId}`, {
      headers: {
        'X-Session-ID': sessionId
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to load session');
    }

    const data = await response.json();
    return {
      ...data.session,
      lastVisited: new Date(data.session.lastVisited)
    };
  }

  /**
   * Delete session from server
   */
  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/navigation/session/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'X-Session-ID': sessionId
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete session');
    }
  }

  /**
   * Auto-save session with debouncing
   */
  private autoSaveTimeout: NodeJS.Timeout | null = null;
  
  autoSaveSession(sessionData: Partial<SessionData>, delay: number = 2000): Promise<SessionData> {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
      }

      // Set new timeout
      this.autoSaveTimeout = setTimeout(async () => {
        try {
          const result = await this.saveSession(sessionData);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  /**
   * Cancel pending auto-save
   */
  cancelAutoSave(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService();