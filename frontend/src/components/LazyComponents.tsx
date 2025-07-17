import { lazy, Suspense } from 'react';

// Lazy load components for better bundle splitting
export const LazyThemeDemo = lazy(() => 
  import('./ThemeDemo').then(module => ({ default: module.ThemeDemo }))
);

export const LazyResponsiveDemo = lazy(() => 
  import('./ResponsiveDemo').then(module => ({ default: module.ResponsiveDemo }))
);

export const LazyBookmarkPanel = lazy(() => 
  import('./BookmarkPanel').then(module => ({ default: module.BookmarkPanel }))
);

// Loading fallback component
export const ComponentLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="component-loader">
      <div className="component-loader__spinner" />
      <span>Loading component...</span>
    </div>
  }>
    {children}
  </Suspense>
);

// Wrapper components with suspense
export const ThemeDemoWithSuspense = () => (
  <ComponentLoader>
    <LazyThemeDemo />
  </ComponentLoader>
);

export const ResponsiveDemoWithSuspense = () => (
  <ComponentLoader>
    <LazyResponsiveDemo />
  </ComponentLoader>
);

export const BookmarkPanelWithSuspense = (props: any) => (
  <ComponentLoader>
    <LazyBookmarkPanel {...props} />
  </ComponentLoader>
);