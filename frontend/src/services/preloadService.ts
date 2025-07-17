// Page preloading service for adjacent pages
// Implements intelligent preloading to improve navigation performance

export interface PreloadConfig {
  adjacentPages: number; // Number of pages to preload on each side
  maxConcurrentLoads: number; // Maximum concurrent preload requests
  preloadDelay: number; // Delay before starting preload (ms)
}

export interface PreloadedPage {
  pageNumber: number;
  imageUrl: string;
  blob?: Blob;
  loadedAt: number;
}

class PreloadService {
  private preloadedPages = new Map<number, PreloadedPage>();
  private loadingPages = new Set<number>();
  private config: PreloadConfig = {
    adjacentPages: 2,
    maxConcurrentLoads: 3,
    preloadDelay: 500,
  };
  private preloadTimeout: NodeJS.Timeout | null = null;

  constructor(config?: Partial<PreloadConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Update configuration
  updateConfig(config: Partial<PreloadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get image URL for a page from the API
  private getImageUrl(pageNumber: number): string {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    return `${API_BASE_URL}/pages/${pageNumber}/image`;
  }

  // Preload pages adjacent to current page
  preloadAdjacentPages(currentPage: number, totalPages: number): void {
    // Clear existing timeout
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout);
    }

    // Delay preloading to avoid interfering with current page load
    this.preloadTimeout = setTimeout(() => {
      this.startPreloading(currentPage, totalPages);
    }, this.config.preloadDelay);
  }

  private async startPreloading(currentPage: number, totalPages: number): Promise<void> {
    const pagesToPreload = this.calculatePagesToPreload(currentPage, totalPages);
    
    // Filter out pages that are already loaded or loading
    const newPagesToLoad = pagesToPreload.filter(
      pageNum => !this.preloadedPages.has(pageNum) && !this.loadingPages.has(pageNum)
    );

    // Limit concurrent loads
    const pagesToLoadNow = newPagesToLoad.slice(0, this.config.maxConcurrentLoads);
    
    // Start preloading
    const preloadPromises = pagesToLoadNow.map(pageNum => this.preloadPage(pageNum));
    
    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Some pages failed to preload:', error);
    }
  }

  private calculatePagesToPreload(currentPage: number, totalPages: number): number[] {
    const pages: number[] = [];
    const { adjacentPages } = this.config;

    // Add pages before current page
    for (let i = 1; i <= adjacentPages; i++) {
      const pageNum = currentPage - i;
      if (pageNum >= 1) {
        pages.push(pageNum);
      }
    }

    // Add pages after current page
    for (let i = 1; i <= adjacentPages; i++) {
      const pageNum = currentPage + i;
      if (pageNum <= totalPages) {
        pages.push(pageNum);
      }
    }

    return pages;
  }

  private async preloadPage(pageNumber: number): Promise<void> {
    if (this.loadingPages.has(pageNumber)) {
      return;
    }

    this.loadingPages.add(pageNumber);

    try {
      const imageUrl = this.getImageUrl(pageNumber);
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page ${pageNumber}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      this.preloadedPages.set(pageNumber, {
        pageNumber,
        imageUrl,
        blob,
        loadedAt: Date.now(),
      });

      console.log(`Preloaded page ${pageNumber}`);
    } catch (error) {
      console.warn(`Failed to preload page ${pageNumber}:`, error);
    } finally {
      this.loadingPages.delete(pageNumber);
    }
  }

  // Get preloaded page blob URL
  getPreloadedPageUrl(pageNumber: number): string | null {
    const preloadedPage = this.preloadedPages.get(pageNumber);
    if (preloadedPage?.blob) {
      return URL.createObjectURL(preloadedPage.blob);
    }
    return null;
  }

  // Check if page is preloaded
  isPagePreloaded(pageNumber: number): boolean {
    return this.preloadedPages.has(pageNumber);
  }

  // Clean up old preloaded pages to manage memory
  cleanupOldPages(currentPage: number, keepRange: number = 5): void {
    const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    
    for (const [pageNumber, preloadedPage] of this.preloadedPages.entries()) {
      const isOutOfRange = Math.abs(pageNumber - currentPage) > keepRange;
      const isOld = preloadedPage.loadedAt < cutoffTime;
      
      if (isOutOfRange || isOld) {
        // Revoke blob URL to free memory
        if (preloadedPage.blob) {
          URL.revokeObjectURL(URL.createObjectURL(preloadedPage.blob));
        }
        this.preloadedPages.delete(pageNumber);
        console.log(`Cleaned up preloaded page ${pageNumber}`);
      }
    }
  }

  // Get preload statistics
  getStats(): {
    preloadedCount: number;
    loadingCount: number;
    memoryUsage: number;
  } {
    let memoryUsage = 0;
    for (const page of this.preloadedPages.values()) {
      if (page.blob) {
        memoryUsage += page.blob.size;
      }
    }

    return {
      preloadedCount: this.preloadedPages.size,
      loadingCount: this.loadingPages.size,
      memoryUsage,
    };
  }

  // Clear all preloaded pages
  clearAll(): void {
    // Revoke all blob URLs
    for (const page of this.preloadedPages.values()) {
      if (page.blob) {
        URL.revokeObjectURL(URL.createObjectURL(page.blob));
      }
    }
    
    this.preloadedPages.clear();
    this.loadingPages.clear();
    
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout);
      this.preloadTimeout = null;
    }
  }
}

// Export singleton instance
export const preloadService = new PreloadService();

// Export class for testing
export { PreloadService };