import './App.css'
import './styles/accessibility.css'
import { ThemeProvider, BackgroundPattern, PageViewer, NavigationControls, ResponsiveLayout, BookmarkPanel, ErrorBoundary, NetworkStatusIndicator, OfflineBanner } from './components'
import { AccessibilityProvider } from './contexts/AccessibilityContext'
import { useSessionState } from './hooks/useSessionState'

import { apiService, type PageData, type NavigationData } from './services/apiService'
import { registerServiceWorker, preloadPages } from './utils/serviceWorker'
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useEffect, useCallback, useState } from 'react'

function App() {
  const [totalPages, setTotalPages] = useState(10000);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [navigationData, setNavigationData] = useState<NavigationData | null>(null);
  const [currentPageData, setCurrentPageData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Network status monitoring
  const { isOnline } = useNetworkStatus();
  
  // Performance monitoring
  const { trackNavigation, reportMetrics } = usePerformanceMonitor({
    enableMemoryMonitoring: true,
    enableNetworkMonitoring: true,
    enableCustomMetrics: true,
  });
  
  // Use session state management
  const {
    sessionState,
    updateCurrentPage,
    addBookmark,
    removeBookmark,
    clearBookmarks,
    isBookmarked,
    loadFromServer
  } = useSessionState(1);

  // Get image URL from API data
  const getImageUrl = (pageNumber: number) => {
    if (currentPageData && currentPageData.pageNumber === pageNumber) {
      return currentPageData.imageUrl;
    }
    // Fallback to API endpoint URL
    return `/api/pages/${pageNumber}/image`;
  };

  const handlePageChange = useCallback((pageNumber: number) => {
    const startTime = performance.now();
    updateCurrentPage(pageNumber);
    
    // Track navigation performance
    requestAnimationFrame(() => {
      const navigationTime = performance.now() - startTime;
      trackNavigation(`page-${pageNumber}`, navigationTime);
    });
  }, [updateCurrentPage, trackNavigation]);

  // Load navigation data and initialize API connection
  useEffect(() => {
    const loadNavigationData = async () => {
      try {
        setIsLoading(true);
        setApiError(null);
        
        // Health check first
        await apiService.healthCheck();
        
        // Load navigation data
        const navData = await apiService.getNavigation();
        setNavigationData(navData);
        setTotalPages(navData.totalPages);
        
        // Set session ID if available
        if (navData.sessionId) {
          apiService.setSessionId(navData.sessionId);
        }
        
      } catch (error) {
        console.error('Failed to load navigation data:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to connect to API');
      } finally {
        setIsLoading(false);
      }
    };

    loadNavigationData();
  }, []);

  // Load current page data when page changes
  useEffect(() => {
    const loadPageData = async () => {
      if (!isOnline) return;
      
      try {
        const pageData = await apiService.getPage(sessionState.currentPage);
        setCurrentPageData(pageData);
        setApiError(null);
      } catch (error) {
        console.error('Failed to load page data:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to load page');
      }
    };

    loadPageData();
  }, [sessionState.currentPage, isOnline]);

  // Auto-save session to API when state changes
  useEffect(() => {
    const autoSave = async () => {
      if (!isOnline) return;
      
      try {
        await apiService.saveSession({
          currentPage: sessionState.currentPage,
          bookmarks: sessionState.bookmarks,
          sessionId: apiService.getSessionId() || undefined
        });
        setApiError(null);
      } catch (error) {
        console.warn('Auto-save failed:', error);
        // Don't set API error for auto-save failures as they're not critical
      }
    };

    // Debounce auto-save to avoid too many requests
    const timeoutId = setTimeout(autoSave, 1000);
    return () => clearTimeout(timeoutId);
  }, [sessionState.currentPage, sessionState.bookmarks, isOnline]);

  // Register service worker and initialize app
  useEffect(() => {
    const initializeApp = async () => {
      // Register service worker
      try {
        const registration = await registerServiceWorker({
          onSuccess: () => {
            console.log('Service Worker registered successfully');
            setServiceWorkerReady(true);
          },
          onUpdate: () => {
            console.log('New service worker available');
            // You could show a notification to the user here
          },
          onError: (error) => {
            console.warn('Service Worker registration failed:', error);
          },
        });

        if (registration) {
          setServiceWorkerReady(true);
        }
      } catch (error) {
        console.warn('Service Worker not supported or failed to register:', error);
      }

      // Load session from server
      try {
        if (sessionState.sessionId && typeof window !== 'undefined' && !window.location.href.includes('test')) {
          await loadFromServer(sessionState.sessionId);
        }
      } catch (error) {
        console.warn('Failed to load session from server:', error);
      }
    };

    initializeApp();
  }, []); // Only run once on mount

  // Preload adjacent pages when current page changes
  useEffect(() => {
    if (serviceWorkerReady) {
      const adjacentPages = [];
      
      // Add previous pages
      for (let i = 1; i <= 2; i++) {
        const prevPage = sessionState.currentPage - i;
        if (prevPage >= 1) {
          adjacentPages.push(prevPage);
        }
      }
      
      // Add next pages
      for (let i = 1; i <= 2; i++) {
        const nextPage = sessionState.currentPage + i;
        if (nextPage <= totalPages) {
          adjacentPages.push(nextPage);
        }
      }
      
      if (adjacentPages.length > 0) {
        preloadPages(adjacentPages);
      }
    }
  }, [sessionState.currentPage, totalPages, serviceWorkerReady]);

  // Report performance metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      reportMetrics();
    }, 30000); // Report every 30 seconds

    return () => clearInterval(interval);
  }, [reportMetrics]);

  const handleImageLoad = () => {
    console.log(`Page ${sessionState.currentPage} loaded successfully`);
  };

  const handleImageError = (error: Error) => {
    console.error('Image load error:', error);
  };

  // Show loading state while initializing
  if (isLoading) {
    return (
      <AccessibilityProvider>
        <ThemeProvider>
          <BackgroundPattern pattern="subtle" opacity={0.03} />
          <div className="app-loading" role="status" aria-live="polite">
            <div className="loading-container">
              <div className="loading-spinner" aria-hidden="true"></div>
              <h2>Loading Punjabi Religious Reader...</h2>
              <p>Connecting to the sacred text library</p>
            </div>
          </div>
        </ThemeProvider>
      </AccessibilityProvider>
    );
  }

  // Show error state if API connection failed
  if (apiError && !navigationData) {
    return (
      <AccessibilityProvider>
        <ThemeProvider>
          <BackgroundPattern pattern="subtle" opacity={0.03} />
          <div className="app-error" role="alert">
            <div className="error-container">
              <h2>Connection Error</h2>
              <p>Unable to connect to the sacred text library:</p>
              <p className="error-message">{apiError}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="retry-button"
                type="button"
              >
                Try Again
              </button>
            </div>
          </div>
        </ThemeProvider>
      </AccessibilityProvider>
    );
  }

  return (
    <AccessibilityProvider>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.error('Application error:', error, errorInfo);
          // In production, send to error tracking service
        }}
        resetKeys={[sessionState.currentPage]}
      >
        <ThemeProvider>
          {/* Skip links for keyboard navigation */}
          <a href="#main-navigation" className="skip-link">Skip to navigation</a>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <a href="#page-content" className="skip-link">Skip to page content</a>
          
          <BackgroundPattern pattern="subtle" opacity={0.03} />
          
          {/* Network status indicators */}
          <OfflineBanner />
          <NetworkStatusIndicator showWhenOnline={true} position="top-right" />
          
          {/* API Error Banner */}
          {apiError && (
            <div className="api-error-banner" role="alert" aria-live="assertive">
              <span>⚠️ {apiError}</span>
              <button 
                onClick={() => setApiError(null)} 
                className="dismiss-error"
                aria-label="Dismiss error"
                type="button"
              >
                ×
              </button>
            </div>
          )}
          
          <ResponsiveLayout
            currentPage={sessionState.currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="app"
          >
            <header className="app-header" role="banner">
              <h1>Punjabi Religious Reader</h1>
              <p>Welcome to the sacred text reader</p>
              <ErrorBoundary
                onError={(error) => console.error('Bookmark panel error:', error)}
                resetKeys={[sessionState.bookmarks]}
              >
                <BookmarkPanel
                  bookmarks={sessionState.bookmarks}
                  currentPage={sessionState.currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onAddBookmark={addBookmark}
                  onRemoveBookmark={removeBookmark}
                  onClearBookmarks={clearBookmarks}
                  isBookmarked={isBookmarked}
                />
              </ErrorBoundary>
            </header>
            <main className="app-main" role="main" id="main-content">
              <ErrorBoundary
                onError={(error) => console.error('Navigation controls error:', error)}
                resetKeys={[sessionState.currentPage]}
              >
                <div id="main-navigation">
                  <NavigationControls
                    currentPage={sessionState.currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    disabled={!isOnline}
                  />
                </div>
              </ErrorBoundary>
              <div className="app-viewer-container">
                <ErrorBoundary
                  onError={(error) => console.error('Page viewer error:', error)}
                  resetKeys={[sessionState.currentPage]}
                >
                  <PageViewer
                    pageNumber={sessionState.currentPage}
                    totalPages={totalPages}
                    imageUrl={getImageUrl(sessionState.currentPage)}
                    onPageChange={handlePageChange}
                    onImageLoad={handleImageLoad}
                    onImageError={handleImageError}
                  />
                </ErrorBoundary>
              </div>
            </main>
          </ResponsiveLayout>
        </ThemeProvider>
      </ErrorBoundary>
    </AccessibilityProvider>
  )
}

export default App