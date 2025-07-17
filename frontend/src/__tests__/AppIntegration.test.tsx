import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from '../App'

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

// Mock performance monitoring
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

// Import the mocked API service
import { apiService } from '../services/apiService'
const mockApiService = vi.mocked(apiService)

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock responses
    mockApiService.healthCheck.mockResolvedValue({
      status: 'ok',
      message: 'API is healthy',
      timestamp: new Date().toISOString()
    })
    
    mockApiService.getNavigation.mockResolvedValue({
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
    })
    
    mockApiService.getPage.mockResolvedValue({
      pageNumber: 1,
      imageUrl: '/api/pages/1/image',
      thumbnailUrl: '/api/pages/1/thumbnail',
      width: 1200,
      height: 1600,
      hasImage: true,
      hasThumbnail: true,
      processedAt: new Date().toISOString(),
      metadata: {
        totalPages: 10000,
        isFirstPage: true,
        isLastPage: false,
        hasNext: true,
        hasPrevious: false
      }
    })
    
    mockApiService.saveSession.mockResolvedValue({
      sessionId: 'test-session-id',
      currentPage: 1,
      bookmarks: [],
      lastVisited: new Date().toISOString()
    })
    
    mockApiService.getSessionId.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should load and display the application successfully', async () => {
    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
    })

    // Verify API calls were made
    expect(mockApiService.healthCheck).toHaveBeenCalled()
    expect(mockApiService.getNavigation).toHaveBeenCalled()
    expect(mockApiService.getPage).toHaveBeenCalledWith(1)
  })

  it('should handle page navigation correctly', async () => {
    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
    })

    // Find and click next page button
    const nextButton = screen.getByRole('button', { name: /next page/i })
    
    await act(async () => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(mockApiService.getPage).toHaveBeenCalledWith(2)
    })
  })

  it('should handle API errors gracefully', async () => {
    mockApiService.healthCheck.mockRejectedValue(new Error('API connection failed'))

    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText(/connection error/i)).toBeInTheDocument()
      expect(screen.getByText(/unable to connect to the sacred text library/i)).toBeInTheDocument()
    })
  })

  it('should display loading state initially', async () => {
    // Make API calls take longer
    mockApiService.healthCheck.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ status: 'ok' }), 100))
    )

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText('Loading Punjabi Religious Reader...')).toBeInTheDocument()
    expect(screen.getByText('Connecting to the sacred text library')).toBeInTheDocument()
  })

  it('should handle session state persistence', async () => {
    mockApiService.getNavigation.mockResolvedValue({
      totalPages: 10000,
      currentPage: 5,
      bookmarks: [1, 10, 25],
      hasSession: true,
      sessionId: 'existing-session',
      processing: {
        isComplete: true,
        processedPages: 10000,
        totalPages: 10000
      },
      limits: {
        minPage: 1,
        maxPage: 10000
      }
    })

    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(mockApiService.getPage).toHaveBeenCalledWith(5)
    })

    // Verify session ID was set
    expect(mockApiService.setSessionId).toHaveBeenCalledWith('existing-session')
  })

  it('should handle bookmark functionality', async () => {
    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
    })

    // Find and click bookmark button
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i })
    
    await act(async () => {
      fireEvent.click(bookmarkButton)
    })

    await waitFor(() => {
      expect(mockApiService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          bookmarks: expect.arrayContaining([1])
        })
      )
    })
  })

  it('should handle offline state', async () => {
    // Mock offline state
    vi.mocked(require('../hooks/useNetworkStatus').useNetworkStatus).mockReturnValue({
      isOnline: false
    })

    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument()
    })
  })

  it('should handle religious theming', async () => {
    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
    })

    // Check for theme-related elements
    const appElement = document.querySelector('.app')
    expect(appElement).toBeInTheDocument()

    // Verify background pattern is applied
    const backgroundPattern = document.querySelector('[class*="background-pattern"]')
    expect(backgroundPattern).toBeInTheDocument()
  })

  it('should handle responsive layout', async () => {
    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
    })

    // Check for responsive layout component
    const responsiveLayout = document.querySelector('[class*="responsive-layout"]')
    expect(responsiveLayout).toBeInTheDocument()
  })

  it('should handle accessibility features', async () => {
    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
    })

    // Check for skip links
    expect(screen.getByText('Skip to navigation')).toBeInTheDocument()
    expect(screen.getByText('Skip to main content')).toBeInTheDocument()
    expect(screen.getByText('Skip to page content')).toBeInTheDocument()

    // Check for proper ARIA roles
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should handle error boundaries', async () => {
    // Mock a component error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    mockApiService.getPage.mockRejectedValue(new Error('Page load failed'))

    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })

  it('should handle page input validation', async () => {
    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText('Punjabi Religious Reader')).toBeInTheDocument()
    })

    // Find page input field
    const pageInput = screen.getByRole('spinbutton', { name: /page number/i })
    
    // Test invalid input
    await act(async () => {
      fireEvent.change(pageInput, { target: { value: '99999' } })
      fireEvent.blur(pageInput)
    })

    // Should not make API call for invalid page
    expect(mockApiService.getPage).not.toHaveBeenCalledWith(99999)
  })
})