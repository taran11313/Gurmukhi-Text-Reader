/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { apiService } from '../services/apiService'

// Mock the API service
vi.mock('../services/apiService', () => ({
  apiService: {
    healthCheck: vi.fn(),
    getNavigation: vi.fn(),
    getPage: vi.fn(),
    saveSession: vi.fn(),
    getSessionId: vi.fn(),
    setSessionId: vi.fn(),
  }
}))

// Mock service worker utilities
vi.mock('../utils/serviceWorker', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue({}),
  preloadPages: vi.fn(),
}))

// Mock performance monitor
vi.mock('../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    trackNavigation: vi.fn(),
    reportMetrics: vi.fn(),
  })
}))

// Mock network status
vi.mock('../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
  })
}))

const mockApiService = apiService as any

describe('End-to-End User Journey Tests', () => {
  const mockNavigationData = {
    totalPages: 100,
    currentPage: 1,
    bookmarks: [],
    hasSession: false,
    sessionId: null,
    processing: {
      isComplete: true,
      processedPages: 100,
      totalPages: 100
    },
    limits: {
      minPage: 1,
      maxPage: 100
    }
  }

  const createMockPageData = (pageNumber: number) => ({
    pageNumber,
    imageUrl: `/api/pages/${pageNumber}/image`,
    thumbnailUrl: `/api/pages/${pageNumber}/thumbnail`,
    width: 1200,
    height: 1600,
    hasImage: true,
    hasThumbnail: true,
    processedAt: '2024-01-01T00:00:00Z',
    metadata: {
      totalPages: 100,
      isFirstPage: pageNumber === 1,
      isLastPage: pageNumber === 100,
      hasNext: pageNumber < 100,
      hasPrevious: pageNumber > 1
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock responses
    mockApiService.healthCheck.mockResolvedValue({
      status: 'OK',
      message: 'API is running',
      timestamp: '2024-01-01T00:00:00Z'
    })
    
    mockApiService.getNavigation.mockResolvedValue(mockNavigationData)
    mockApiService.getPage.mockImplementation((pageNumber: number) => 
      Promise.resolve(createMockPageData(pageNumber))
    )
    mockApiService.saveSession.mockResolvedValue({
      sessionId: 'test-session-id',
      currentPage: 1,
      bookmarks: [],
      lastVisited: '2024-01-01T00:00:00Z'
    })
    mockApiService.getSessionId.mockReturnValue(null)
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Reading Session Journey', () => {
    it('should support a complete reading session from start to finish', async () => {
      const user = userEvent.setup()
      
      // 1. User opens the application
      render(<App />)
      
      // Should show loading state
      expect(screen.getByText('Loading Punjabi Religious Reader...')).toBeInTheDocument()
      
      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
      })
      
      // Verify initial state
      expect(screen.getByDisplayValue('1')).toBeInTheDocument() // Page input shows page 1
      expect(screen.getByText('Page 1 of 100')).toBeInTheDocument()
      
      // 2. User reads first page and navigates forward
      const nextButton = screen.getByLabelText(/next page/i)
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(2)
      })
      
      // 3. User continues reading several pages
      for (let page = 3; page <= 5; page++) {
        await user.click(nextButton)
        await waitFor(() => {
          expect(mockApiService.getPage).toHaveBeenCalledWith(page)
        })
      }
      
      // 4. User bookmarks current page (page 5)
      const bookmarkButton = screen.getByLabelText(/bookmark/i)
      await user.click(bookmarkButton)
      
      // Should save session with bookmark
      await waitFor(() => {
        expect(mockApiService.saveSession).toHaveBeenCalledWith(
          expect.objectContaining({
            bookmarks: expect.arrayContaining([5])
          })
        )
      }, { timeout: 2000 })
      
      // 5. User jumps to a specific page using page input
      const pageInput = screen.getByLabelText(/go to page/i)
      await user.clear(pageInput)
      await user.type(pageInput, '25')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(25)
      })
      
      // 6. User navigates back using previous button
      const prevButton = screen.getByLabelText(/previous page/i)
      await user.click(prevButton)
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(24)
      })
      
      // 7. User uses keyboard navigation
      const pageViewer = screen.getByRole('img', { name: /page/i })
      await user.click(pageViewer) // Focus the page viewer
      await user.keyboard('{ArrowRight}') // Next page
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(25)
      })
      
      await user.keyboard('{ArrowLeft}') // Previous page
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(24)
      })
      
      // 8. Verify session persistence throughout the journey
      expect(mockApiService.saveSession).toHaveBeenCalledTimes(expect.any(Number))
      
      console.log('✓ Complete reading session journey verified')
    })

    it('should handle bookmark management throughout a session', async () => {
      const user = userEvent.setup()
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
      })
      
      // Navigate to page 10
      const pageInput = screen.getByLabelText(/go to page/i)
      await user.clear(pageInput)
      await user.type(pageInput, '10')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(10)
      })
      
      // Add bookmark on page 10
      const bookmarkButton = screen.getByLabelText(/bookmark/i)
      await user.click(bookmarkButton)
      
      // Navigate to page 20 and bookmark it
      await user.clear(pageInput)
      await user.type(pageInput, '20')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(20)
      })
      
      await user.click(bookmarkButton)
      
      // Navigate to page 30 and bookmark it
      await user.clear(pageInput)
      await user.type(pageInput, '30')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(30)
      })
      
      await user.click(bookmarkButton)
      
      // Verify all bookmarks were saved
      await waitFor(() => {
        expect(mockApiService.saveSession).toHaveBeenCalledWith(
          expect.objectContaining({
            bookmarks: expect.arrayContaining([10, 20, 30])
          })
        )
      }, { timeout: 3000 })
      
      console.log('✓ Bookmark management journey verified')
    })

    it('should handle error recovery during a reading session', async () => {
      const user = userEvent.setup()
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
      })
      
      // Simulate API error for page 5
      mockApiService.getPage.mockImplementation((pageNumber: number) => {
        if (pageNumber === 5) {
          return Promise.reject(new Error('Page not found'))
        }
        return Promise.resolve(createMockPageData(pageNumber))
      })
      
      // Navigate to page 5 (should fail)
      const pageInput = screen.getByLabelText(/go to page/i)
      await user.clear(pageInput)
      await user.type(pageInput, '5')
      await user.keyboard('{Enter}')
      
      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Page not found/)).toBeInTheDocument()
      })
      
      // User dismisses error and tries different page
      const dismissButton = screen.getByLabelText(/dismiss error/i)
      await user.click(dismissButton)
      
      // Navigate to page 6 (should work)
      await user.clear(pageInput)
      await user.type(pageInput, '6')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(6)
      })
      
      // Error should be gone
      expect(screen.queryByText(/Page not found/)).not.toBeInTheDocument()
      
      console.log('✓ Error recovery journey verified')
    })
  })

  describe('Accessibility User Journey', () => {
    it('should support complete keyboard-only navigation', async () => {
      const user = userEvent.setup()
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
      })
      
      // Start with skip links
      await user.tab()
      expect(screen.getByText('Skip to navigation')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Skip to main content')).toHaveFocus()
      
      // Skip to navigation
      await user.keyboard('{Enter}')
      
      // Should focus on navigation controls
      const navigationControls = screen.getByRole('navigation') || screen.getByLabelText(/navigation/i)
      expect(navigationControls).toBeInTheDocument()
      
      // Navigate through controls with tab
      await user.tab()
      const prevButton = screen.getByLabelText(/previous page/i)
      expect(prevButton).toHaveFocus()
      
      await user.tab()
      const pageInput = screen.getByLabelText(/go to page/i)
      expect(pageInput).toHaveFocus()
      
      // Use page input with keyboard
      await user.clear(pageInput)
      await user.type(pageInput, '10')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(10)
      })
      
      // Continue tabbing to next button
      await user.tab()
      const nextButton = screen.getByLabelText(/next page/i)
      expect(nextButton).toHaveFocus()
      
      // Use next button with keyboard
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(11)
      })
      
      console.log('✓ Keyboard-only navigation journey verified')
    })

    it('should provide proper screen reader announcements', async () => {
      const user = userEvent.setup()
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
      })
      
      // Check for live regions
      const liveRegions = screen.getAllByRole('status', { hidden: true })
      expect(liveRegions.length).toBeGreaterThan(0)
      
      // Navigate to trigger announcements
      const nextButton = screen.getByLabelText(/next page/i)
      await user.click(nextButton)
      
      // Should have proper ARIA labels
      expect(nextButton).toHaveAttribute('aria-label')
      
      const pageInput = screen.getByLabelText(/go to page/i)
      expect(pageInput).toHaveAttribute('aria-label')
      
      // Check for proper heading structure
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()
      
      console.log('✓ Screen reader support journey verified')
    })
  })

  describe('Mobile User Journey', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })
    })

    it('should support touch-based navigation', async () => {
      const user = userEvent.setup()
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
      })
      
      const pageViewer = screen.getByRole('img', { name: /page/i })
      
      // Simulate touch swipe (simplified)
      fireEvent.touchStart(pageViewer, {
        touches: [{ clientX: 200, clientY: 300 }]
      })
      
      fireEvent.touchMove(pageViewer, {
        touches: [{ clientX: 100, clientY: 300 }]
      })
      
      fireEvent.touchEnd(pageViewer, {
        changedTouches: [{ clientX: 100, clientY: 300 }]
      })
      
      // Should trigger page change
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(2)
      })
      
      console.log('✓ Touch navigation journey verified')
    })

    it('should adapt UI for mobile viewport', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
      })
      
      // Check for responsive layout
      const responsiveLayout = document.querySelector('.responsive-layout')
      expect(responsiveLayout).toBeInTheDocument()
      
      // Navigation should be touch-friendly
      const nextButton = screen.getByLabelText(/next page/i)
      const buttonStyles = window.getComputedStyle(nextButton)
      
      // Button should be large enough for touch (at least 44px)
      const minTouchSize = 44
      expect(parseInt(buttonStyles.minHeight) || parseInt(buttonStyles.height)).toBeGreaterThanOrEqual(minTouchSize)
      
      console.log('✓ Mobile UI adaptation journey verified')
    })
  })

  describe('Performance User Journey', () => {
    it('should maintain good performance during extended reading session', async () => {
      const user = userEvent.setup()
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
      })
      
      const startTime = performance.now()
      
      // Simulate rapid page navigation
      const nextButton = screen.getByLabelText(/next page/i)
      
      for (let i = 0; i < 10; i++) {
        await user.click(nextButton)
        await waitFor(() => {
          expect(mockApiService.getPage).toHaveBeenCalledWith(i + 2)
        })
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Should complete 10 page navigations in reasonable time (under 5 seconds)
      expect(totalTime).toBeLessThan(5000)
      
      // Memory usage should be reasonable (this is a simplified check)
      if (performance.memory) {
        expect(performance.memory.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024) // 50MB
      }
      
      console.log(`✓ Performance journey verified (${totalTime.toFixed(2)}ms for 10 navigations)`)
    })
  })

  describe('Offline/Network Error Journey', () => {
    it('should handle network connectivity issues gracefully', async () => {
      const user = userEvent.setup()
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
      })
      
      // Simulate network error
      mockApiService.getPage.mockRejectedValue(new Error('Network error'))
      
      const nextButton = screen.getByLabelText(/next page/i)
      await user.click(nextButton)
      
      // Should show network error
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument()
      })
      
      // User should still be able to interact with the app
      const pageInput = screen.getByLabelText(/go to page/i)
      expect(pageInput).toBeEnabled()
      
      // Restore network and try again
      mockApiService.getPage.mockImplementation((pageNumber: number) => 
        Promise.resolve(createMockPageData(pageNumber))
      )
      
      // Dismiss error and try navigation again
      const dismissButton = screen.getByLabelText(/dismiss error/i)
      await user.click(dismissButton)
      
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(mockApiService.getPage).toHaveBeenCalledWith(2)
      })
      
      console.log('✓ Network error recovery journey verified')
    })
  })
})