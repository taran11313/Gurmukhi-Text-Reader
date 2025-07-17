// Image caching service with progressive loading support
// Provides efficient image caching and progressive loading capabilities

export interface CacheConfig {
  maxCacheSize: number; // Maximum cache size in bytes
  maxCacheAge: number; // Maximum age in milliseconds
  compressionQuality: number; // JPEG compression quality (0-1)
}

export interface CachedImage {
  url: string;
  blob: Blob;
  cachedAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface ProgressiveImageOptions {
  lowQualityUrl?: string;
  highQualityUrl: string;
  onLowQualityLoad?: () => void;
  onHighQualityLoad?: () => void;
  onError?: (error: Error) => void;
}

class ImageCacheService {
  private cache = new Map<string, CachedImage>();
  private config: CacheConfig = {
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
    compressionQuality: 0.8,
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Update configuration
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get cached image or fetch and cache it
  async getImage(url: string): Promise<string> {
    // Check if image is in cache and still valid
    const cached = this.cache.get(url);
    if (cached && this.isCacheValid(cached)) {
      // Update access statistics
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      
      return URL.createObjectURL(cached.blob);
    }

    // Fetch and cache the image
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Cache the image
      await this.cacheImage(url, blob);
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to get image:', error);
      throw error;
    }
  }

  // Progressive image loading
  async loadProgressiveImage(options: ProgressiveImageOptions): Promise<{
    lowQualityUrl?: string;
    highQualityUrl: string;
  }> {
    const { lowQualityUrl, highQualityUrl, onLowQualityLoad, onHighQualityLoad, onError } = options;
    
    const result: { lowQualityUrl?: string; highQualityUrl: string } = {
      highQualityUrl,
    };

    try {
      // Load low quality image first if provided
      if (lowQualityUrl) {
        try {
          result.lowQualityUrl = await this.getImage(lowQualityUrl);
          onLowQualityLoad?.();
        } catch (error) {
          console.warn('Failed to load low quality image:', error);
        }
      }

      // Load high quality image
      result.highQualityUrl = await this.getImage(highQualityUrl);
      onHighQualityLoad?.();

      return result;
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }

  // Cache an image blob
  private async cacheImage(url: string, blob: Blob): Promise<void> {
    const size = blob.size;
    
    // Check if we need to make space
    await this.ensureCacheSpace(size);
    
    // Add to cache
    this.cache.set(url, {
      url,
      blob,
      cachedAt: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    });

    console.log(`Cached image: ${url} (${this.formatBytes(size)})`);
  }

  // Ensure there's enough space in cache
  private async ensureCacheSpace(requiredSize: number): Promise<void> {
    const currentSize = this.getCurrentCacheSize();
    const availableSpace = this.config.maxCacheSize - currentSize;

    if (availableSpace >= requiredSize) {
      return; // Enough space available
    }

    const spaceToFree = requiredSize - availableSpace;
    await this.freeUpSpace(spaceToFree);
  }

  // Free up cache space using LRU strategy
  private async freeUpSpace(targetSize: number): Promise<void> {
    // Sort cached images by last accessed time (LRU)
    const sortedEntries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedSize = 0;
    
    for (const [url, cached] of sortedEntries) {
      if (freedSize >= targetSize) {
        break;
      }

      // Revoke blob URL and remove from cache
      URL.revokeObjectURL(URL.createObjectURL(cached.blob));
      this.cache.delete(url);
      freedSize += cached.size;
      
      console.log(`Evicted from cache: ${url} (${this.formatBytes(cached.size)})`);
    }
  }

  // Check if cached image is still valid
  private isCacheValid(cached: CachedImage): boolean {
    const age = Date.now() - cached.cachedAt;
    return age < this.config.maxCacheAge;
  }

  // Get current cache size
  getCurrentCacheSize(): number {
    let totalSize = 0;
    for (const cached of this.cache.values()) {
      totalSize += cached.size;
    }
    return totalSize;
  }

  // Clean up expired cache entries
  cleanupExpiredEntries(): void {
    const expiredEntries: string[] = [];

    for (const [url, cached] of this.cache.entries()) {
      if (!this.isCacheValid(cached)) {
        expiredEntries.push(url);
      }
    }

    for (const url of expiredEntries) {
      const cached = this.cache.get(url);
      if (cached) {
        URL.revokeObjectURL(URL.createObjectURL(cached.blob));
        this.cache.delete(url);
        console.log(`Removed expired cache entry: ${url}`);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    totalEntries: number;
    totalSize: number;
    maxSize: number;
    hitRate: number;
    averageAge: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalSize = this.getCurrentCacheSize();
    const now = Date.now();
    
    let totalAccess = 0;
    let totalAge = 0;
    
    for (const cached of entries) {
      totalAccess += cached.accessCount;
      totalAge += now - cached.cachedAt;
    }

    const averageAge = entries.length > 0 ? totalAge / entries.length : 0;
    const hitRate = totalAccess > entries.length ? (totalAccess - entries.length) / totalAccess : 0;

    return {
      totalEntries: entries.length,
      totalSize,
      maxSize: this.config.maxCacheSize,
      hitRate,
      averageAge,
    };
  }

  // Clear entire cache
  clearCache(): void {
    // Revoke all blob URLs
    for (const cached of this.cache.values()) {
      URL.revokeObjectURL(URL.createObjectURL(cached.blob));
    }
    
    this.cache.clear();
    console.log('Cache cleared');
  }

  // Format bytes for display
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Preload images
  async preloadImages(urls: string[]): Promise<void> {
    const preloadPromises = urls.map(url => 
      this.getImage(url).catch(error => {
        console.warn(`Failed to preload image ${url}:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  // Check if image is cached
  isCached(url: string): boolean {
    const cached = this.cache.get(url);
    return cached ? this.isCacheValid(cached) : false;
  }
}

// Export singleton instance
export const imageCacheService = new ImageCacheService();

// Export class for testing
export { ImageCacheService };