import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export interface UseNetworkStatusReturn extends NetworkStatus {
  checkConnection: () => Promise<boolean>;
  lastChecked: Date | null;
}

// Default network status for when navigator.connection is not available
const DEFAULT_NETWORK_STATUS: NetworkStatus = {
  isOnline: true,
  isSlowConnection: false,
  connectionType: 'unknown',
  effectiveType: 'unknown',
  downlink: 0,
  rtt: 0,
};

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    if (typeof navigator === 'undefined') {
      return DEFAULT_NETWORK_STATUS;
    }

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    return {
      isOnline: navigator.onLine,
      isSlowConnection: connection ? connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' : false,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
    };
  });

  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const updateNetworkStatus = useCallback(() => {
    if (typeof navigator === 'undefined') return;

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const isSlowConnection = connection ? 
      (connection.effectiveType === 'slow-2g' || 
       connection.effectiveType === '2g' ||
       connection.downlink < 0.5) : false;

    setNetworkStatus({
      isOnline: navigator.onLine,
      isSlowConnection,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
    });
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch the API health endpoint to test connectivity
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      const isConnected = response.ok;
      setLastChecked(new Date());
      
      // Update online status based on actual connectivity test
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: isConnected,
      }));
      
      return isConnected;
    } catch (error) {
      console.warn('Connection check failed:', error);
      setLastChecked(new Date());
      
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
      }));
      
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Update network status when online/offline events occur
    const handleOnline = () => {
      updateNetworkStatus();
      checkConnection();
    };

    const handleOffline = () => {
      updateNetworkStatus();
    };

    // Update network status when connection changes
    const handleConnectionChange = () => {
      updateNetworkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial connection check
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus, checkConnection]);

  return {
    ...networkStatus,
    checkConnection,
    lastChecked,
  };
}

// Hook for handling offline functionality
export function useOfflineSupport() {
  const networkStatus = useNetworkStatus();
  const [offlineQueue, setOfflineQueue] = useState<Array<() => Promise<any>>>([]);

  const addToOfflineQueue = useCallback((operation: () => Promise<any>) => {
    setOfflineQueue(prev => [...prev, operation]);
  }, []);

  const processOfflineQueue = useCallback(async () => {
    if (!networkStatus.isOnline || offlineQueue.length === 0) return;

    const operations = [...offlineQueue];
    setOfflineQueue([]);

    for (const operation of operations) {
      try {
        await operation();
      } catch (error) {
        console.error('Failed to process offline operation:', error);
        // Re-add failed operations to queue
        setOfflineQueue(prev => [...prev, operation]);
      }
    }
  }, [networkStatus.isOnline, offlineQueue]);

  useEffect(() => {
    if (networkStatus.isOnline) {
      processOfflineQueue();
    }
  }, [networkStatus.isOnline, processOfflineQueue]);

  return {
    ...networkStatus,
    offlineQueue,
    addToOfflineQueue,
    processOfflineQueue,
    hasOfflineOperations: offlineQueue.length > 0,
  };
}