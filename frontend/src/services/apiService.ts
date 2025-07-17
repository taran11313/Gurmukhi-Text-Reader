/**
 * API Service for communicating with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface PageData {
  pageNumber: number;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  hasImage: boolean;
  hasThumbnail: boolean;
  processedAt: string | null;
  metadata: {
    totalPages: number;
    isFirstPage: boolean;
    isLastPage: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface NavigationData {
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

export interface SessionData {
  sessionId: string;
  currentPage: number;
  bookmarks: number[];
  lastVisited: string;
}

class ApiService {
  private sessionId: string | null = null;

  constructor() {
    // Try to get session ID from localStorage
    this.sessionId = localStorage.getItem('sessionId');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add session ID to headers if available
    if (this.sessionId) {
      headers['x-session-id'] = this.sessionId;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Get page data including metadata and image URLs
   */
  async getPage(pageNumber: number): Promise<PageData> {
    const response = await this.request<{ success: boolean; page: PageData }>(`/pages/${pageNumber}`);
    return response.page;
  }

  /**
   * Get navigation metadata including total pages and session info
   */
  async getNavigation(): Promise<NavigationData> {
    const response = await this.request<{ success: boolean; navigation: NavigationData }>('/navigation');
    return response.navigation;
  }

  /**
   * Save session state including current page and bookmarks
   */
  async saveSession(data: {
    currentPage?: number;
    bookmarks?: number[];
    sessionId?: string;
  }): Promise<SessionData> {
    const response = await this.request<{ success: boolean; session: SessionData }>('/navigation/bookmark', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store session ID for future requests
    if (response.session.sessionId) {
      this.sessionId = response.session.sessionId;
      localStorage.setItem('sessionId', this.sessionId);
    }

    return response.session;
  }

  /**
   * Get specific session data
   */
  async getSession(sessionId: string): Promise<SessionData> {
    const response = await this.request<{ success: boolean; session: SessionData }>(`/navigation/session/${sessionId}`);
    return response.session;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.request<{ success: boolean; message: string }>(`/navigation/session/${sessionId}`, {
      method: 'DELETE',
    });
    
    // Clear local session if it matches
    if (this.sessionId === sessionId) {
      this.sessionId = null;
      localStorage.removeItem('sessionId');
    }
  }

  /**
   * Get multiple pages metadata for preloading
   */
  async getPageRange(start: number, end: number): Promise<PageData[]> {
    const response = await this.request<{ success: boolean; pages: PageData[] }>(`/pages/range/${start}/${end}`);
    return response.pages;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    return response.json();
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Set session ID manually
   */
  setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }
}

export const apiService = new ApiService();