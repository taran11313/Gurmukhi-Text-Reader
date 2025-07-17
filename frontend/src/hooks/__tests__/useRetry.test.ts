import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useRetry, useImageRetry, useNetworkRetry, usePageLoadRetry } from '../useRetry';

// Mock timers
vi.useFakeTimers();

describe('useRetry', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  it('executes operation successfully on first try', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry(mockOperation));

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    await waitFor(() => {
      expect(result.current.state.isRetrying).toBe(false);
    });

    expect(await promise!).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.state.attemptCount).toBe(1);
    expect(result.current.state.lastError).toBeNull();
  });

  it('retries operation on failure', async () => {
    const mockOperation = vi
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => 
      useRetry(mockOperation, { delay: 1000 })
    );

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    // Wait for first failure
    await waitFor(() => {
      expect(result.current.state.attemptCount).toBe(1);
      expect(result.current.state.lastError).toBeTruthy();
    });

    // Fast-forward timer to trigger retry
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.state.isRetrying).toBe(false);
    });

    expect(await promise!).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(result.current.state.attemptCount).toBe(2);
    expect(result.current.state.lastError).toBeNull();
  });

  it('respects maxAttempts configuration', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
    const onMaxAttemptsReached = vi.fn();

    const { result } = renderHook(() => 
      useRetry(mockOperation, { 
        maxAttempts: 2, 
        delay: 100,
        onMaxAttemptsReached 
      })
    );

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    // Fast-forward through all retries
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.state.canRetry).toBe(false);
    });

    await expect(promise!).rejects.toThrow('Always fails');
    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(onMaxAttemptsReached).toHaveBeenCalledWith(expect.any(Error));
  });

  it('applies exponential backoff', async () => {
    const mockOperation = vi
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => 
      useRetry(mockOperation, { 
        delay: 1000, 
        backoffMultiplier: 2 
      })
    );

    const startTime = Date.now();
    let promise: Promise<string>;
    
    act(() => {
      promise = result.current.execute();
    });

    // First retry after 1000ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.state.attemptCount).toBe(2);
    });

    // Second retry after 2000ms (backoff applied)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.state.isRetrying).toBe(false);
    });

    expect(await promise!).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('respects retryCondition', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('404 Not Found'));
    const retryCondition = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => 
      useRetry(mockOperation, { retryCondition })
    );

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    await waitFor(() => {
      expect(result.current.state.canRetry).toBe(false);
    });

    await expect(promise!).rejects.toThrow('404 Not Found');
    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(retryCondition).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls onRetry callback', async () => {
    const mockOperation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failure'))
      .mockResolvedValue('success');
    
    const onRetry = vi.fn();

    const { result } = renderHook(() => 
      useRetry(mockOperation, { onRetry, delay: 100 })
    );

    act(() => {
      result.current.execute();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  it('can be reset', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('Failure'));

    const { result } = renderHook(() => useRetry(mockOperation));

    act(() => {
      result.current.execute().catch(() => {});
    });

    await waitFor(() => {
      expect(result.current.state.attemptCount).toBe(1);
      expect(result.current.state.lastError).toBeTruthy();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.attemptCount).toBe(0);
    expect(result.current.state.lastError).toBeNull();
    expect(result.current.state.canRetry).toBe(true);
  });

  it('handles manual retry', async () => {
    const mockOperation = vi
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useRetry(mockOperation));

    // First execution fails
    act(() => {
      result.current.execute().catch(() => {});
    });

    await waitFor(() => {
      expect(result.current.state.lastError).toBeTruthy();
      expect(result.current.state.canRetry).toBe(true);
    });

    // Manual retry
    let retryPromise: Promise<string>;
    act(() => {
      retryPromise = result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.state.isRetrying).toBe(false);
    });

    expect(await retryPromise!).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('throws error when retrying after max attempts', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));

    const { result } = renderHook(() => 
      useRetry(mockOperation, { maxAttempts: 1 })
    );

    act(() => {
      result.current.execute().catch(() => {});
    });

    await waitFor(() => {
      expect(result.current.state.canRetry).toBe(false);
    });

    expect(() => result.current.retry()).toThrow('Maximum retry attempts reached');
  });
});

describe('Specialized retry hooks', () => {
  it('useImageRetry has correct retry condition', async () => {
    const mockLoadImage = vi.fn().mockRejectedValue(new Error('404 Not Found'));

    const { result } = renderHook(() => useImageRetry(mockLoadImage));

    act(() => {
      result.current.execute().catch(() => {});
    });

    await waitFor(() => {
      expect(result.current.state.canRetry).toBe(false);
    });

    expect(mockLoadImage).toHaveBeenCalledTimes(1);
  });

  it('useNetworkRetry retries on network errors', async () => {
    const mockNetworkOp = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => 
      useNetworkRetry(mockNetworkOp, { delay: 100 })
    );

    act(() => {
      result.current.execute();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.state.isRetrying).toBe(false);
    });

    expect(mockNetworkOp).toHaveBeenCalledTimes(2);
  });

  it('usePageLoadRetry has appropriate configuration', async () => {
    const mockLoadPage = vi
      .fn()
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValue('page content');

    const { result } = renderHook(() => usePageLoadRetry(mockLoadPage));

    act(() => {
      result.current.execute();
    });

    // Should have maxAttempts of 3 and delay of 1500ms
    expect(result.current.state.canRetry).toBe(true);
    
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(result.current.state.isRetrying).toBe(false);
    });

    expect(mockLoadPage).toHaveBeenCalledTimes(2);
  });
});