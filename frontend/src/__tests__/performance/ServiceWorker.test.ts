import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isServiceWorkerSupported,
  registerServiceWorker,
  unregisterServiceWorker,
  sendMessageToServiceWorker,
  preloadPages,
  skipWaiting,
  addServiceWorkerMessageListener,
  isOffline,
  addNetworkStatusListeners,
} from '../../utils/serviceWorker';

// Mock service worker APIs
const mockServiceWorker = {
  register: vi.fn(),
  ready: Promise.resolve({
    unregister: vi.fn().mockResolvedValue(true),
    active: true,
  }),
  controller: {
    postMessage: vi.fn(),
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockRegistration = {
  installing: null,
  active: true,
  addEventListener: vi.fn(),
  unregister: vi.fn().mockResolvedValue(true),
};

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: mockServiceWorker,
    onLine: true,
  },
  writable: true,
});

// Mock window
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

describe('Service Worker Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isServiceWorkerSupported', () => {
    it('should return true when service worker is supported', () => {
      expect(isServiceWorkerSupported()).toBe(true);
    });

    it('should return false when service worker is not supported', () => {
      const originalNavigator = global.navigator;
      // @ts-ignore
      global.navigator = {};
      
      expect(isServiceWorkerSupported()).toBe(false);
      
      global.navigator = originalNavigator;
    });
  });

  describe('registerServiceWorker', () => {
    it('should register service worker successfully', async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      
      const config = {
        onSuccess: vi.fn(),
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };

      const registration = await registerServiceWorker(config);

      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
        scope: '/',
      });
      expect(registration).toBe(mockRegistration);
      expect(config.onSuccess).toHaveBeenCalledWith(mockRegistration);
    });

    it('should handle registration failure', async () => {
      const error = new Error('Registration failed');
      mockServiceWorker.register.mockRejectedValue(error);
      
      const config = {
        onError: vi.fn(),
      };

      const registration = await registerServiceWorker(config);

      expect(registration).toBeNull();
      expect(config.onError).toHaveBeenCalledWith(error);
    });

    it('should return null when service worker is not supported', async () => {
      const originalNavigator = global.navigator;
      // @ts-ignore
      global.navigator = {};
      
      const registration = await registerServiceWorker();
      
      expect(registration).toBeNull();
      
      global.navigator = originalNavigator;
    });
  });

  describe('unregisterServiceWorker', () => {
    it('should unregister service worker successfully', async () => {
      const result = await unregisterServiceWorker();
      
      expect(result).toBe(true);
    });

    it('should return false when service worker is not supported', async () => {
      const originalNavigator = global.navigator;
      // @ts-ignore
      global.navigator = {};
      
      const result = await unregisterServiceWorker();
      
      expect(result).toBe(false);
      
      global.navigator = originalNavigator;
    });
  });

  describe('sendMessageToServiceWorker', () => {
    it('should send message to service worker', () => {
      const message = { type: 'TEST_MESSAGE', data: 'test' };
      
      sendMessageToServiceWorker(message);
      
      expect(mockServiceWorker.controller.postMessage).toHaveBeenCalledWith(message);
    });

    it('should not send message when no controller', () => {
      const originalController = mockServiceWorker.controller;
      mockServiceWorker.controller = null;
      
      const message = { type: 'TEST_MESSAGE' };
      
      sendMessageToServiceWorker(message);
      
      expect(mockServiceWorker.controller).toBeNull();
      
      mockServiceWorker.controller = originalController;
    });
  });

  describe('preloadPages', () => {
    it('should send preload message to service worker', () => {
      const pageNumbers = [1, 2, 3];
      
      preloadPages(pageNumbers);
      
      expect(mockServiceWorker.controller.postMessage).toHaveBeenCalledWith({
        type: 'PRELOAD_PAGES',
        pages: pageNumbers,
      });
    });
  });

  describe('skipWaiting', () => {
    it('should send skip waiting message to service worker', () => {
      skipWaiting();
      
      expect(mockServiceWorker.controller.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING',
      });
    });
  });

  describe('addServiceWorkerMessageListener', () => {
    it('should add and remove message listener', () => {
      const callback = vi.fn();
      
      const removeListener = addServiceWorkerMessageListener(callback);
      
      expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith('message', callback);
      
      removeListener();
      
      expect(mockServiceWorker.removeEventListener).toHaveBeenCalledWith('message', callback);
    });
  });

  describe('isOffline', () => {
    it('should return false when online', () => {
      expect(isOffline()).toBe(false);
    });

    it('should return true when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });
      
      expect(isOffline()).toBe(true);
      
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });
    });
  });

  describe('addNetworkStatusListeners', () => {
    it('should add and remove network status listeners', () => {
      const onOnline = vi.fn();
      const onOffline = vi.fn();
      
      const removeListeners = addNetworkStatusListeners(onOnline, onOffline);
      
      expect(window.addEventListener).toHaveBeenCalledWith('online', onOnline);
      expect(window.addEventListener).toHaveBeenCalledWith('offline', onOffline);
      
      removeListeners();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('online', onOnline);
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', onOffline);
    });
  });
});