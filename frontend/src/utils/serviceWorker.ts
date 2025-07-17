// Service Worker registration and management utilities

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

// Check if service workers are supported
export const isServiceWorkerSupported = (): boolean => {
  return 'serviceWorker' in navigator;
};

// Register service worker
export const registerServiceWorker = async (config?: ServiceWorkerConfig): Promise<ServiceWorkerRegistration | null> => {
  if (!isServiceWorkerSupported()) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available
            config?.onUpdate?.(registration);
          }
        });
      }
    });

    // Check for existing service worker
    if (registration.active) {
      config?.onSuccess?.(registration);
    }

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    config?.onError?.(error as Error);
    return null;
  }
};

// Unregister service worker
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
};

// Send message to service worker
export const sendMessageToServiceWorker = (message: any): void => {
  if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage(message);
};

// Preload pages using service worker
export const preloadPages = (pageNumbers: number[]): void => {
  sendMessageToServiceWorker({
    type: 'PRELOAD_PAGES',
    pages: pageNumbers,
  });
};

// Skip waiting for new service worker
export const skipWaiting = (): void => {
  sendMessageToServiceWorker({
    type: 'SKIP_WAITING',
  });
};

// Listen for service worker messages
export const addServiceWorkerMessageListener = (
  callback: (event: MessageEvent) => void
): (() => void) => {
  if (!isServiceWorkerSupported()) {
    return () => {};
  }

  navigator.serviceWorker.addEventListener('message', callback);
  
  return () => {
    navigator.serviceWorker.removeEventListener('message', callback);
  };
};

// Check if app is running offline
export const isOffline = (): boolean => {
  return !navigator.onLine;
};

// Add online/offline event listeners
export const addNetworkStatusListeners = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};