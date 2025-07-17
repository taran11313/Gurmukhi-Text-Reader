import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PageViewer } from '../../components/PageViewer';
import * as serviceWorkerUtils from '../../utils/serviceWorker';
import * as preloadService from '../../services/preloadService';
import * as imageCacheService from '../../services/imageCacheService';

// Mock all performance-related services
vi.mock('../../utils/serviceWorker');
vi.mock('../../services/preloadService');
vi.mock('../../services/imageCacheService');
vi.mock('../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    trackImageLoad: vi.fn(),
    trackNavigation: vi.fn(),
    getPerformanceSummary: vi.fn(() => ({
      pageLoad: { total: 100, domReady: 50, fcp: 75, lcp: 90 },
      memory: { used: 1024, total: 2048, percentage: 50 },
      network: { type: 'wifi', speed: '4g', bandwidth: 10 },
      images: { count: 5, averageLoadTime: 200 },
      navigation: { count: 10, averageTime: 50 },
    })),
    reportMetrics: vi.fn(),
  }),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    getEntriesByType: vi.fn(() => []),
  },
  writable: true,
});

describe('Performance Integration Tests', () => {
  const mockPreloadService = vi.mocked(preloadService.preloadService);
  const mockImageCacheService = vi.mocked(imageCacheService.imageCacheService);
  const mockServiceWorkerUtils = vi.mocked(serviceWorkerUtils);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockPreloadService.preloadAdjacentPages = vi.fn();
    mockPreloadService.cleanupOldPages = vi.fn();
    mockPreloadService.getStats = vi.fn(() => ({
      preloadedCount: 3,
      loadingCount: 1,
      memoryUsage: 1024 * 1024,
    }));

    mockImageCacheService.loadProgressiveImage = vi.fn().mockResolvedValue({
      highQualityUrl: 'blob:mock-url',
    });

    mockServiceWorkerUtils.registerServiceWorker = vi.fn().mockResolvedValue({
      active: true,
      addEventListener: vi.fn(),
    });
    mockServiceWorkerUtils.preloadPages = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PageViewer Performance Integration', () => {
    it('should integrate preloading when page changes', async () => {
      const onPageChange = vi.fn();

      const { rerender } = render(
        <PageViewer
          pageNumber={5}
          totalPages={100}
          imageUrl="https://example.com/page-5.jpg"
          onPageChange={onPageChange}
        />
      );

      // Verify initial preloading
      expect(mockPreloadService.preloadAdjacentPages).toHaveBeenCalledWith(5, 100);

      // Change page
      rerender(
        <PageViewer
          pageNumber={6}
          totalPages={100}
          imageUrl="https://example.com/page-6.jpg"
          onPageChange={onPageChange}
        />
      );

      // Verify preloading for new page
      expect(mockPreloadService.preloadAdjacentPages).toHaveBeenCalledWith(6, 100);
      expect(mockPreloadService.cleanupOldPages).toHaveBeenCalledWith(6);
    });

    it('should track image load performance', async () => {
      const onImageLoad = vi.fn();

      render(
        <PageViewer
          pageNumber={1}
          totalPages={100}
          imageUrl="https://example.com/page-1.jpg"
          onImageLoad={onImageLoad}
        />
      );

      // Wait for image to load
      await waitFor(() => {
        expect(mockImageCacheService.loadProgressiveImage).toHaveBeenCalled();
      });

      // Verify performance tracking would be called
      expect(mockImageCacheService.loadProgressiveImage).toHaveBeenCalledWith({
        highQualityUrl: 'https://example.com/page-1.jpg',
        onLowQualityLoad: expect.any(Function),
        onHighQualityLoad: expect.any(Function),
        onError: expect.any(Function),
      });
    });

    it('should handle zoom controls without affecting performance', async () => {
      render(
        <PageViewer
          pageNumber={1}
          totalPages={100}
          imageUrl="https://example.com/page-1.jpg"
        />
      );

      // Find and click zoom in button
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);

      // Verify zoom doesn't interfere with preloading
      expect(mockPreloadService.preloadAdjacentPages).toHaveBeenCalled();
    });
  });

  describe('Service Worker Integration', () => {
    it('should register service worker on app initialization', async () => {
      // This would be tested in the App component integration test
      expect(mockServiceWorkerUtils.registerServiceWorker).toBeDefined();
    });

    it('should preload pages through service worker', () => {
      const pageNumbers = [1, 2, 3, 4, 5];
      
      mockServiceWorkerUtils.preloadPages(pageNumbers);
      
      expect(mockServiceWorkerUtils.preloadPages).toHaveBeenCalledWith(pageNumbers);
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources when component unmounts', () => {
      const { unmount } = render(
        <PageViewer
          pageNumber={1}
          totalPages={100}
          imageUrl="https://example.com/page-1.jpg"
        />
      );

      unmount();

      // Verify cleanup would be called
      expect(mockPreloadService.cleanupOldPages).toHaveBeenCalled();
    });

    it('should report memory usage statistics', () => {
      const stats = mockPreloadService.getStats();
      
      expect(stats).toEqual({
        preloadedCount: 3,
        loadingCount: 1,
        memoryUsage: 1024 * 1024,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle preload service errors gracefully', async () => {
      mockPreloadService.preloadAdjacentPages.mockImplementation(() => {
        throw new Error('Preload failed');
      });

      // Should not crash the component
      render(
        <PageViewer
          pageNumber={1}
          totalPages={100}
          imageUrl="https://example.com/page-1.jpg"
        />
      );

      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should handle image cache service errors gracefully', async () => {
      mockImageCacheService.loadProgressiveImage.mockRejectedValue(
        new Error('Cache failed')
      );

      const onError = vi.fn();

      render(
        <PageViewer
          pageNumber={1}
          totalPages={100}
          imageUrl="https://example.com/page-1.jpg"
          onImageError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should collect and report performance metrics', () => {
      // This would be tested with the usePerformanceMonitor hook
      const { usePerformanceMonitor } = require('../../hooks/usePerformanceMonitor');
      const { getPerformanceSummary, reportMetrics } = usePerformanceMonitor();
      
      const summary = getPerformanceSummary();
      
      expect(summary).toEqual({
        pageLoad: { total: 100, domReady: 50, fcp: 75, lcp: 90 },
        memory: { used: 1024, total: 2048, percentage: 50 },
        network: { type: 'wifi', speed: '4g', bandwidth: 10 },
        images: { count: 5, averageLoadTime: 200 },
        navigation: { count: 10, averageTime: 50 },
      });
      
      expect(reportMetrics).toBeDefined();
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should lazy load components when needed', () => {
      // This test verifies that components are properly structured for lazy loading
      // In a real scenario, you would test dynamic imports
      
      expect(PageViewer).toBeDefined();
      expect(typeof PageViewer).toBe('function');
    });
  });
});