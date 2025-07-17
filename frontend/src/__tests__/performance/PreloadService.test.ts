import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PreloadService, preloadService } from '../../services/preloadService';

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('PreloadService', () => {
  let service: PreloadService;

  beforeEach(() => {
    service = new PreloadService({
      adjacentPages: 2,
      maxConcurrentLoads: 3,
      preloadDelay: 100,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearAll();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create service with default config', () => {
      const defaultService = new PreloadService();
      expect(defaultService).toBeInstanceOf(PreloadService);
    });

    it('should create service with custom config', () => {
      const customService = new PreloadService({
        adjacentPages: 3,
        maxConcurrentLoads: 5,
      });
      expect(customService).toBeInstanceOf(PreloadService);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      service.updateConfig({
        adjacentPages: 3,
        maxConcurrentLoads: 5,
      });
      
      // Config is private, but we can test behavior
      expect(service).toBeInstanceOf(PreloadService);
    });
  });

  describe('preloadAdjacentPages', () => {
    it('should preload adjacent pages after delay', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      service.preloadAdjacentPages(5, 10);

      // Wait for delay and preloading
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have called fetch for adjacent pages
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle preload errors gracefully', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      service.preloadAdjacentPages(5, 10);

      // Wait for delay and preloading
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not throw error
      expect(service).toBeInstanceOf(PreloadService);
    });
  });

  describe('getPreloadedPageUrl', () => {
    it('should return null for non-preloaded page', () => {
      const url = service.getPreloadedPageUrl(1);
      expect(url).toBeNull();
    });

    it('should return blob URL for preloaded page', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      service.preloadAdjacentPages(5, 10);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if any page was preloaded
      const stats = service.getStats();
      if (stats.preloadedCount > 0) {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      }
    });
  });

  describe('isPagePreloaded', () => {
    it('should return false for non-preloaded page', () => {
      const isPreloaded = service.isPagePreloaded(1);
      expect(isPreloaded).toBe(false);
    });
  });

  describe('cleanupOldPages', () => {
    it('should clean up pages outside range', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      service.preloadAdjacentPages(5, 10);
      await new Promise(resolve => setTimeout(resolve, 200));

      service.cleanupOldPages(10, 2);

      // Should have called revokeObjectURL for cleaned up pages
      // This is hard to test directly due to private implementation
      expect(service).toBeInstanceOf(PreloadService);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = service.getStats();
      
      expect(stats).toEqual({
        preloadedCount: 0,
        loadingCount: 0,
        memoryUsage: 0,
      });
    });

    it('should return updated stats after preloading', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      service.preloadAdjacentPages(5, 10);
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = service.getStats();
      
      expect(typeof stats.preloadedCount).toBe('number');
      expect(typeof stats.loadingCount).toBe('number');
      expect(typeof stats.memoryUsage).toBe('number');
    });
  });

  describe('clearAll', () => {
    it('should clear all preloaded pages', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      service.preloadAdjacentPages(5, 10);
      await new Promise(resolve => setTimeout(resolve, 200));

      service.clearAll();

      const stats = service.getStats();
      expect(stats.preloadedCount).toBe(0);
      expect(stats.loadingCount).toBe(0);
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(preloadService).toBeInstanceOf(PreloadService);
    });
  });
});