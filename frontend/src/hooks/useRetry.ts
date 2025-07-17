import { useState, useCallback, useRef, useEffect } from 'react';

export interface RetryConfig {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxAttemptsReached?: (error: Error) => void;
}

export interface RetryState {
  isRetrying: boolean;
  attemptCount: number;
  lastError: Error | null;
  canRetry: boolean;
}

export interface UseRetryReturn<T> {
  execute: () => Promise<T>;
  retry: () => Promise<T>;
  reset: () => void;
  state: RetryState;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  delay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  retryCondition: () => true,
  onRetry: () => {},
  onMaxAttemptsReached: () => {},
};

export function useRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): UseRetryReturn<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const timeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attemptCount: 0,
    lastError: null,
    canRetry: true,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = finalConfig.delay * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, finalConfig.maxDelay);
  }, [finalConfig.delay, finalConfig.backoffMultiplier, finalConfig.maxDelay]);

  const executeWithRetry = useCallback(async (isRetry = false): Promise<T> => {
    if (!mountedRef.current) {
      throw new Error('Component unmounted');
    }

    const currentAttempt = isRetry ? state.attemptCount + 1 : 1;

    setState(prev => ({
      ...prev,
      isRetrying: true,
      attemptCount: currentAttempt,
      canRetry: currentAttempt < finalConfig.maxAttempts,
    }));

    try {
      const result = await operation();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isRetrying: false,
          lastError: null,
        }));
      }
      
      return result;
    } catch (error) {
      const err = error as Error;
      
      if (!mountedRef.current) {
        throw err;
      }

      const shouldRetry = finalConfig.retryCondition(err) && currentAttempt < finalConfig.maxAttempts;

      setState(prev => ({
        ...prev,
        isRetrying: false,
        lastError: err,
        canRetry: shouldRetry,
      }));

      if (shouldRetry) {
        finalConfig.onRetry(currentAttempt, err);
        
        const delay = calculateDelay(currentAttempt);
        
        return new Promise<T>((resolve, reject) => {
          timeoutRef.current = window.setTimeout(async () => {
            if (!mountedRef.current) {
              reject(new Error('Component unmounted'));
              return;
            }
            
            try {
              const result = await executeWithRetry(true);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, delay);
        });
      } else {
        finalConfig.onMaxAttemptsReached(err);
        throw err;
      }
    }
  }, [operation, state.attemptCount, finalConfig, calculateDelay]);

  const execute = useCallback(() => executeWithRetry(false), [executeWithRetry]);

  const retry = useCallback(() => {
    if (!state.canRetry) {
      throw new Error('Maximum retry attempts reached');
    }
    return executeWithRetry(true);
  }, [executeWithRetry, state.canRetry]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setState({
      isRetrying: false,
      attemptCount: 0,
      lastError: null,
      canRetry: true,
    });
  }, []);

  return {
    execute,
    retry,
    reset,
    state,
  };
}

// Specialized retry hooks for common scenarios
export function useImageRetry(
  loadImage: () => Promise<string>,
  config?: Omit<RetryConfig, 'retryCondition'>
) {
  return useRetry(loadImage, {
    ...config,
    retryCondition: (error) => {
      // Retry on network errors, but not on 404s
      return !error.message.includes('404') && !error.message.includes('Not Found');
    },
  });
}

export function useNetworkRetry<T>(
  networkOperation: () => Promise<T>,
  config?: Omit<RetryConfig, 'retryCondition'>
) {
  return useRetry(networkOperation, {
    maxAttempts: 5,
    delay: 2000,
    ...config,
    retryCondition: (error) => {
      // Retry on network errors, timeouts, and 5xx errors
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch') ||
        message.includes('5') // 5xx errors
      );
    },
  });
}

export function usePageLoadRetry(
  loadPage: () => Promise<string>,
  config?: RetryConfig
) {
  return useRetry(loadPage, {
    maxAttempts: 3,
    delay: 1500,
    backoffMultiplier: 1.5,
    ...config,
    retryCondition: (error) => {
      // Don't retry on client errors (4xx), but retry on server errors and network issues
      const message = error.message.toLowerCase();
      return !message.includes('4') || message.includes('network') || message.includes('timeout');
    },
  });
}