import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useNetworkStatus, useOfflineSupport } from '../useNetworkStatus';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock navigator.connection
const mockConnection = {
  effectiveType: '4g',
  type: 'wifi',
  downlink: 10,
  rtt: 50,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: mockConnection,
});

// Mock fetch for connection checks
global.fetch = vi.fn();

// Mock window.addEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
    });
    navigator.onLine = true;
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 10;
  });

  it('returns initial network status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
    expect(result.current.connectionType).toBe('wifi');
    expect(result.current.effectiveType).toBe('4g');
    expect(result.current.downlink).toBe(10);
    expect(result.current.rtt).toBe(50);
  });

  it('detects slow connection', () => {
    mockConnection.effectiveType = '2g';
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(true);
  });

  it('detects slow connection based on downlink', () => {
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 0.3; // Less than 0.5
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(true);
  });

  it('sets up event listeners on mount', () => {
    renderHook(() => useNetworkStatus());

    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(mockConnection.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('checks connection status', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    let connectionResult: boolean;
    await act(async () => {
      connectionResult = await result.current.checkConnection();
    });

    expect(connectionResult!).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/favicon.ico', expect.objectContaining({
      method: 'HEAD',
      cache: 'no-cache',
    }));
    expect(result.current.lastChecked).toBeInstanceOf(Date);
  });

  it('handles connection check failure', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useNetworkStatus());

    let connectionResult: boolean;
    await act(async () => {
      connectionResult = await result.current.checkConnection();
    });

    expect(connectionResult!).toBe(false);
    expect(result.current.isOnline).toBe(false);
  });

  it('updates status when connection fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
    });
    
    const { result } = renderHook(() => useNetworkStatus());

    await act(async () => {
      await result.current.checkConnection();
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('handles missing navigator.connection gracefully', () => {
    const originalConnection = (navigator as any).connection;
    delete (navigator as any).connection;

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.connectionType).toBe('unknown');
    expect(result.current.effectiveType).toBe('unknown');
    expect(result.current.downlink).toBe(0);
    expect(result.current.rtt).toBe(0);

    (navigator as any).connection = originalConnection;
  });
});

describe('useOfflineSupport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
    });
    navigator.onLine = true;
  });

  it('returns network status and offline queue functionality', () => {
    const { result } = renderHook(() => useOfflineSupport());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.offlineQueue).toEqual([]);
    expect(result.current.hasOfflineOperations).toBe(false);
    expect(typeof result.current.addToOfflineQueue).toBe('function');
    expect(typeof result.current.processOfflineQueue).toBe('function');
  });

  it('adds operations to offline queue', () => {
    const { result } = renderHook(() => useOfflineSupport());
    const mockOperation = vi.fn().mockResolvedValue('success');

    act(() => {
      result.current.addToOfflineQueue(mockOperation);
    });

    expect(result.current.offlineQueue).toHaveLength(1);
    expect(result.current.hasOfflineOperations).toBe(true);
  });

  it('processes offline queue when coming back online', async () => {
    const { result } = renderHook(() => useOfflineSupport());
    const mockOperation1 = vi.fn().mockResolvedValue('success1');
    const mockOperation2 = vi.fn().mockResolvedValue('success2');

    // Add operations to queue
    act(() => {
      result.current.addToOfflineQueue(mockOperation1);
      result.current.addToOfflineQueue(mockOperation2);
    });

    expect(result.current.offlineQueue).toHaveLength(2);

    // Process queue
    await act(async () => {
      await result.current.processOfflineQueue();
    });

    expect(mockOperation1).toHaveBeenCalled();
    expect(mockOperation2).toHaveBeenCalled();
    expect(result.current.offlineQueue).toHaveLength(0);
    expect(result.current.hasOfflineOperations).toBe(false);
  });

  it('re-adds failed operations to queue', async () => {
    const { result } = renderHook(() => useOfflineSupport());
    const mockOperation = vi.fn().mockRejectedValue(new Error('Failed'));

    act(() => {
      result.current.addToOfflineQueue(mockOperation);
    });

    await act(async () => {
      await result.current.processOfflineQueue();
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result.current.offlineQueue).toHaveLength(1); // Re-added after failure
  });

  it('does not process queue when offline', async () => {
    // Mock offline state
    navigator.onLine = false;
    
    const { result } = renderHook(() => useOfflineSupport());
    const mockOperation = vi.fn().mockResolvedValue('success');

    act(() => {
      result.current.addToOfflineQueue(mockOperation);
    });

    await act(async () => {
      await result.current.processOfflineQueue();
    });

    expect(mockOperation).not.toHaveBeenCalled();
    expect(result.current.offlineQueue).toHaveLength(1);
  });

  it('automatically processes queue when network comes back online', async () => {
    const { result, rerender } = renderHook(() => useOfflineSupport());
    const mockOperation = vi.fn().mockResolvedValue('success');

    // Start offline
    navigator.onLine = false;
    rerender();

    act(() => {
      result.current.addToOfflineQueue(mockOperation);
    });

    // Come back online
    navigator.onLine = true;
    rerender();

    await waitFor(() => {
      expect(mockOperation).toHaveBeenCalled();
    });

    expect(result.current.offlineQueue).toHaveLength(0);
  });
});