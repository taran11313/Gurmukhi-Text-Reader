import { useEffect, useRef, useState, useCallback } from 'react';

export interface PerformanceMetrics {
  // Page load metrics
  pageLoadTime: number;
  domContentLoadedTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  
  // Runtime metrics
  memoryUsage: number;
  jsHeapSize: number;
  
  // Custom metrics
  imageLoadTimes: Map<string, number>;
  navigationTimes: Map<string, number>;
  
  // Network metrics
  connectionType: string;
  effectiveType: string;
  downlink: number;
}

export interface PerformanceConfig {
  enableMemoryMonitoring?: boolean;
  enableNetworkMonitoring?: boolean;
  enableCustomMetrics?: boolean;
  reportingInterval?: number;
}

// Hook for monitoring application performance
export const usePerformanceMonitor = (config: PerformanceConfig = {}) => {
  const {
    enableMemoryMonitoring = true,
    enableNetworkMonitoring = true,
    enableCustomMetrics = true,
    reportingInterval = 5000, // 5 seconds
  } = config;

  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({
    imageLoadTimes: new Map(),
    navigationTimes: new Map(),
  });

  const metricsRef = useRef<Partial<PerformanceMetrics>>(metrics);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update metrics ref when state changes
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  // Collect initial page load metrics
  const collectPageLoadMetrics = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const newMetrics: Partial<PerformanceMetrics> = {};

    if (navigation) {
      newMetrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      newMetrics.domContentLoadedTime = navigation.domContentLoadedEventEnd - navigation.fetchStart;
    }

    // First Contentful Paint
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      newMetrics.firstContentfulPaint = fcp.startTime;
    }

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            setMetrics(prev => ({
              ...prev,
              largestContentfulPaint: lastEntry.startTime,
            }));
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observation not supported:', error);
      }
    }

    setMetrics(prev => ({ ...prev, ...newMetrics }));
  }, []);

  // Collect memory metrics
  const collectMemoryMetrics = useCallback(() => {
    if (typeof window === 'undefined' || !enableMemoryMonitoring) {
      return;
    }

    // @ts-ignore - performance.memory is not in TypeScript types but exists in Chrome
    const memory = (performance as any).memory;
    if (memory) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize,
        jsHeapSize: memory.totalJSHeapSize,
      }));
    }
  }, [enableMemoryMonitoring]);

  // Collect network metrics
  const collectNetworkMetrics = useCallback(() => {
    if (typeof window === 'undefined' || !enableNetworkMonitoring) {
      return;
    }

    // @ts-ignore - navigator.connection is experimental
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      setMetrics(prev => ({
        ...prev,
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
      }));
    }
  }, [enableNetworkMonitoring]);

  // Track image load time
  const trackImageLoad = useCallback((imageUrl: string, loadTime: number) => {
    if (!enableCustomMetrics) return;

    setMetrics(prev => {
      const newImageLoadTimes = new Map(prev.imageLoadTimes);
      newImageLoadTimes.set(imageUrl, loadTime);
      return {
        ...prev,
        imageLoadTimes: newImageLoadTimes,
      };
    });
  }, [enableCustomMetrics]);

  // Track navigation time
  const trackNavigation = useCallback((action: string, duration: number) => {
    if (!enableCustomMetrics) return;

    setMetrics(prev => {
      const newNavigationTimes = new Map(prev.navigationTimes);
      newNavigationTimes.set(action, duration);
      return {
        ...prev,
        navigationTimes: newNavigationTimes,
      };
    });
  }, [enableCustomMetrics]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const current = metricsRef.current;
    
    return {
      // Page load performance
      pageLoad: {
        total: current.pageLoadTime || 0,
        domReady: current.domContentLoadedTime || 0,
        fcp: current.firstContentfulPaint || 0,
        lcp: current.largestContentfulPaint || 0,
      },
      
      // Memory usage
      memory: {
        used: current.memoryUsage || 0,
        total: current.jsHeapSize || 0,
        percentage: current.jsHeapSize ? 
          Math.round((current.memoryUsage || 0) / current.jsHeapSize * 100) : 0,
      },
      
      // Network info
      network: {
        type: current.connectionType || 'unknown',
        speed: current.effectiveType || 'unknown',
        bandwidth: current.downlink || 0,
      },
      
      // Custom metrics
      images: {
        count: current.imageLoadTimes?.size || 0,
        averageLoadTime: current.imageLoadTimes?.size ? 
          Array.from(current.imageLoadTimes.values()).reduce((a, b) => a + b, 0) / current.imageLoadTimes.size : 0,
      },
      
      navigation: {
        count: current.navigationTimes?.size || 0,
        averageTime: current.navigationTimes?.size ?
          Array.from(current.navigationTimes.values()).reduce((a, b) => a + b, 0) / current.navigationTimes.size : 0,
      },
    };
  }, []);

  // Report performance metrics
  const reportMetrics = useCallback(() => {
    const summary = getPerformanceSummary();
    console.log('Performance Metrics:', summary);
    
    // You could send this to an analytics service
    // analytics.track('performance_metrics', summary);
    
    return summary;
  }, [getPerformanceSummary]);

  // Initialize performance monitoring
  useEffect(() => {
    // Collect initial metrics
    collectPageLoadMetrics();
    collectMemoryMetrics();
    collectNetworkMetrics();

    // Set up periodic reporting
    intervalRef.current = setInterval(() => {
      collectMemoryMetrics();
      collectNetworkMetrics();
    }, reportingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [collectPageLoadMetrics, collectMemoryMetrics, collectNetworkMetrics, reportingInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    metrics,
    trackImageLoad,
    trackNavigation,
    getPerformanceSummary,
    reportMetrics,
  };
};

// Hook for measuring component render performance
export const useRenderPerformance = (componentName: string) => {
  const renderStartRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const totalRenderTimeRef = useRef<number>(0);

  // Mark render start
  const markRenderStart = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  // Mark render end
  const markRenderEnd = useCallback(() => {
    if (renderStartRef.current > 0) {
      const renderTime = performance.now() - renderStartRef.current;
      renderCountRef.current += 1;
      totalRenderTimeRef.current += renderTime;
      
      console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      renderStartRef.current = 0;
    }
  }, [componentName]);

  // Get render statistics
  const getRenderStats = useCallback(() => {
    return {
      componentName,
      renderCount: renderCountRef.current,
      totalRenderTime: totalRenderTimeRef.current,
      averageRenderTime: renderCountRef.current > 0 ? 
        totalRenderTimeRef.current / renderCountRef.current : 0,
    };
  }, [componentName]);

  // Auto-mark render start on every render
  useEffect(() => {
    markRenderStart();
    return markRenderEnd;
  });

  return {
    markRenderStart,
    markRenderEnd,
    getRenderStats,
  };
};