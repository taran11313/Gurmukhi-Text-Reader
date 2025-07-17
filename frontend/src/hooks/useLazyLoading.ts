import { useEffect, useRef, useState, useCallback } from 'react';

export interface LazyLoadingOptions {
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
  enabled?: boolean;
}

export interface LazyLoadingResult {
  ref: React.RefObject<HTMLElement>;
  isIntersecting: boolean;
  hasIntersected: boolean;
}

// Hook for lazy loading with Intersection Observer
export const useLazyLoading = (options: LazyLoadingOptions = {}): LazyLoadingResult => {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    triggerOnce = true,
    enabled = true,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    const isCurrentlyIntersecting = entry.isIntersecting;
    
    setIsIntersecting(isCurrentlyIntersecting);
    
    if (isCurrentlyIntersecting && !hasIntersected) {
      setHasIntersected(true);
      
      if (triggerOnce && observerRef.current) {
        observerRef.current.disconnect();
      }
    }
  }, [hasIntersected, triggerOnce]);

  useEffect(() => {
    if (!enabled || !ref.current) {
      return;
    }

    // Create intersection observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    // Start observing
    observerRef.current.observe(ref.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, rootMargin, threshold, handleIntersection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    ref,
    isIntersecting,
    hasIntersected,
  };
};

// Hook for lazy loading multiple elements
export const useLazyLoadingList = <T extends HTMLElement>(
  options: LazyLoadingOptions = {}
) => {
  const [intersectingElements, setIntersectingElements] = useState<Set<T>>(new Set());
  const [intersectedElements, setIntersectedElements] = useState<Set<T>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<T>>(new Set());

  const {
    rootMargin = '50px',
    threshold = 0.1,
    triggerOnce = true,
    enabled = true,
  } = options;

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const newIntersecting = new Set(intersectingElements);
    const newIntersected = new Set(intersectedElements);

    entries.forEach((entry) => {
      const element = entry.target as T;
      
      if (entry.isIntersecting) {
        newIntersecting.add(element);
        newIntersected.add(element);
        
        if (triggerOnce && observerRef.current) {
          observerRef.current.unobserve(element);
        }
      } else {
        newIntersecting.delete(element);
      }
    });

    setIntersectingElements(newIntersecting);
    setIntersectedElements(newIntersected);
  }, [intersectingElements, intersectedElements, triggerOnce]);

  // Initialize observer
  useEffect(() => {
    if (!enabled) {
      return;
    }

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    // Observe existing elements
    elementsRef.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, rootMargin, threshold, handleIntersection]);

  // Add element to observation
  const addElement = useCallback((element: T) => {
    if (!element || elementsRef.current.has(element)) {
      return;
    }

    elementsRef.current.add(element);
    
    if (observerRef.current && enabled) {
      observerRef.current.observe(element);
    }
  }, [enabled]);

  // Remove element from observation
  const removeElement = useCallback((element: T) => {
    if (!element || !elementsRef.current.has(element)) {
      return;
    }

    elementsRef.current.delete(element);
    
    if (observerRef.current) {
      observerRef.current.unobserve(element);
    }

    // Clean up state
    setIntersectingElements(prev => {
      const newSet = new Set(prev);
      newSet.delete(element);
      return newSet;
    });
  }, []);

  // Check if element is intersecting
  const isIntersecting = useCallback((element: T) => {
    return intersectingElements.has(element);
  }, [intersectingElements]);

  // Check if element has intersected
  const hasIntersected = useCallback((element: T) => {
    return intersectedElements.has(element);
  }, [intersectedElements]);

  return {
    addElement,
    removeElement,
    isIntersecting,
    hasIntersected,
    intersectingElements,
    intersectedElements,
  };
};