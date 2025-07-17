import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImageCacheService, imageCacheService } from '../../services/imageCacheService';

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('ImageCacheService', () => {
  let service: ImageCacheService;

  beforeEach(() => {
    service = new ImageCacheService({
      maxCacheSize: 1024 * 1024, // 1MB
      maxCacheAge: 60000, // 1 minute
      compressionQuality: 0.8,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearCache();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create service with default config', () => {
      const defaultService = new ImageCacheService();
      expect(defaultService).toBeInstanceOf(ImageCacheService);
    });

    it('should create service with custom config', () => {
      const customService = new ImageCacheService({
        maxCacheSize: 2048,
        maxCacheAge: 30000,
      });
      expect(customService).toBeInstanceOf(ImageCacheService);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      service.updateConfig({
        maxCacheSize: 2048,
        compressionQuality: 0.9,
      });
      
      expect(service).toBeInstanceOf(ImageCacheService);
    });
  });

  describe('getImage', () => {
    it('should fetch and cache image successfully', async () => {
      const mockBlob = new Blob(['test image'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const url = 'https://example.com/image.jpg';
      const result = await service.getImage(url);

      expect(fetch).toHaveBeenCalledWith(url);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(result).toBe('blob:mock-url');
    });

    it('should return cached image on subsequent calls', async () => {
      const mockBlob = new Blob(['test image'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const url = 'https://example.com/image.jpg';
      
      // First call
      await service.getImage(url);
      
      // Second call should use cache
      const result = await service.getImage(url);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toBe('blob:mock-url');
    });

    it('should handle fetch errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      const url = 'https://example.com/nonexistent.jpg';

      await expect(service.getImage(url)).rejects.toThrow('Failed to fetch image: Not Found');
    });

    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      const url = 'https://example.com/image.jpg';

      await expect(service.getImage(url)).rejects.toThrow('Network error');
    });
  });

  describe('loadProgressiveImage', () => {
    it('should load progressive image with low and high quality', async () => {
      const mockBlob = new Blob(['test image'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const onLowQualityLoad = vi.fn();
      const onHighQualityLoad = vi.fn();

      const result = await service.loadProgressiveImage({
        lowQualityUrl: 'https://example.com/low.jpg',
        highQualityUrl: 'https://example.com/high.jpg',
        onLowQualityLoad,
        onHighQualityLoad,
      });

      expect(result.lowQualityUrl).toBe('blob:mock-url');
      expect(result.highQualityUrl).toBe('blob:mock-url');
      expect(onLowQualityLoad).toHaveBeenCalled();
      expect(onHighQualityLoad).toHaveBeenCalled();
    });

    it('should handle errors in progressive loading', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      const onError = vi.fn();

      await expect(service.loadProgressiveImage({
        highQualityUrl: 'https://example.com/image.jpg',
        onError,
      })).rejects.toThrow('Network error');

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('getCurrentCacheSize', () => {
    it('should return 0 for empty cache', () => {
      const size = service.getCurrentCacheSize();
      expect(size).toBe(0);
    });

    it('should return correct size after caching images', async () => {
      const mockBlob = new Blob(['test image'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      await service.getImage('https://example.com/image.jpg');

      const size = service.getCurrentCacheSize();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should remove expired entries', async () => {
      const mockBlob = new Blob(['test image'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      // Create service with very short cache age
      const shortCacheService = new ImageCacheService({
        maxCacheAge: 1, // 1ms
      });

      await shortCacheService.getImage('https://example.com/image.jpg');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      shortCacheService.cleanupExpiredEntries();

      const stats = shortCacheService.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = service.getStats();
      
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(typeof stats.averageAge).toBe('number');
    });

    it('should return updated stats after caching', async () => {
      const mockBlob = new Blob(['test image'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      await service.getImage('https://example.com/image.jpg');

      const stats = service.getStats();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached images', async () => {
      const mockBlob = new Blob(['test image'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      await service.getImage('https://example.com/image.jpg');

      service.clearCache();

      const stats = service.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('preloadImages', () => {
    it('should preload multiple images', async () => {
      const mockBlob = new Blob(['test image'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      await service.preloadImages(urls);

      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle preload errors gracefully', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      const urls = ['https://example.com/image.jpg'];

      // Should not throw
      await service.preloadImages(urls);

      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('isCached', () => {
    it('should return false for non-cached image', () => {
      const isCached = service.isCached('https://example.com/image.jpg');
      expect(isCached).toBe(false);
    });

    it('should return true for cached image', async () => {
      const mockBlob = new Blob(['test image'], { type: 'image/jpeg' });
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const url = 'https://example.com/image.jpg';
      await service.getImage(url);

      const isCached = service.isCached(url);
      expect(isCached).toBe(true);
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(imageCacheService).toBeInstanceOf(ImageCacheService);
    });
  });
});