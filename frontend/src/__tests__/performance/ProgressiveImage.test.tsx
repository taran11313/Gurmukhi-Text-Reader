import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProgressiveImage } from '../../components/ProgressiveImage';
import * as imageCacheService from '../../services/imageCacheService';

// Mock the image cache service
vi.mock('../../services/imageCacheService', () => ({
  imageCacheService: {
    loadProgressiveImage: vi.fn(),
  },
}));

// Mock URL.revokeObjectURL
global.URL.revokeObjectURL = vi.fn();

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

describe('ProgressiveImage', () => {
  const mockLoadProgressiveImage = vi.mocked(imageCacheService.imageCacheService.loadProgressiveImage);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render loading placeholder initially', () => {
      mockLoadProgressiveImage.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          alt="Test image"
          loading="eager"
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Loading Test image' })).toBeInTheDocument();
    });

    it('should render custom placeholder when provided', () => {
      mockLoadProgressiveImage.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          alt="Test image"
          loading="eager"
          placeholder={<div>Custom loading...</div>}
        />
      );

      expect(screen.getByText('Custom loading...')).toBeInTheDocument();
    });

    it('should render error state when image fails to load', async () => {
      const error = new Error('Failed to load');
      mockLoadProgressiveImage.mockRejectedValue(error);

      const onError = vi.fn();

      render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          alt="Test image"
          loading="eager"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should render image when loaded successfully', async () => {
      mockLoadProgressiveImage.mockResolvedValue({
        highQualityUrl: 'blob:high-quality-url',
      });

      const onLoad = vi.fn();

      render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          alt="Test image"
          loading="eager"
          onLoad={onLoad}
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img', { name: 'Test image' });
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'blob:high-quality-url');
      });
    });
  });

  describe('progressive loading', () => {
    it('should load low quality image first, then high quality', async () => {
      const onLowQualityLoad = vi.fn();
      const onHighQualityLoad = vi.fn();

      mockLoadProgressiveImage.mockImplementation(async ({ onLowQualityLoad: onLow, onHighQualityLoad: onHigh }) => {
        // Simulate low quality load first
        onLow?.();
        
        // Then high quality
        setTimeout(() => {
          onHigh?.();
        }, 100);

        return {
          lowQualityUrl: 'blob:low-quality-url',
          highQualityUrl: 'blob:high-quality-url',
        };
      });

      render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          lowQualitySrc="https://example.com/image-low.jpg"
          alt="Test image"
          loading="eager"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img', { name: 'Test image' });
        expect(img).toBeInTheDocument();
      });

      expect(mockLoadProgressiveImage).toHaveBeenCalledWith({
        lowQualityUrl: 'https://example.com/image-low.jpg',
        highQualityUrl: 'https://example.com/image.jpg',
        onLowQualityLoad: expect.any(Function),
        onHighQualityLoad: expect.any(Function),
        onError: expect.any(Function),
      });
    });
  });

  describe('lazy loading', () => {
    it('should use intersection observer for lazy loading', () => {
      render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          alt="Test image"
          loading="lazy"
        />
      );

      expect(IntersectionObserver).toHaveBeenCalled();
    });

    it('should load immediately when loading is eager', () => {
      mockLoadProgressiveImage.mockResolvedValue({
        highQualityUrl: 'blob:high-quality-url',
      });

      render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          alt="Test image"
          loading="eager"
        />
      );

      expect(mockLoadProgressiveImage).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should revoke blob URL on unmount', async () => {
      mockLoadProgressiveImage.mockResolvedValue({
        highQualityUrl: 'blob:high-quality-url',
      });

      const { unmount } = render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          alt="Test image"
          loading="eager"
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      unmount();

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:high-quality-url');
    });
  });

  describe('styling and classes', () => {
    it('should apply custom className and style', async () => {
      mockLoadProgressiveImage.mockResolvedValue({
        highQualityUrl: 'blob:high-quality-url',
      });

      render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          alt="Test image"
          loading="eager"
          className="custom-class"
          style={{ width: '100px' }}
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img', { name: 'Test image' });
        expect(img).toHaveClass('progressive-image', 'custom-class');
        expect(img).toHaveStyle({ width: '100px' });
      });
    });

    it('should apply quality-specific classes', async () => {
      mockLoadProgressiveImage.mockImplementation(async ({ onLowQualityLoad, onHighQualityLoad }) => {
        onLowQualityLoad?.();
        
        setTimeout(() => {
          onHighQualityLoad?.();
        }, 100);

        return {
          lowQualityUrl: 'blob:low-quality-url',
          highQualityUrl: 'blob:high-quality-url',
        };
      });

      render(
        <ProgressiveImage
          src="https://example.com/image.jpg"
          lowQualitySrc="https://example.com/image-low.jpg"
          alt="Test image"
          loading="eager"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img', { name: 'Test image' });
        expect(img).toHaveClass('progressive-image--low-quality');
      });

      // Wait for high quality to load
      await waitFor(() => {
        const img = screen.getByRole('img', { name: 'Test image' });
        expect(img).toHaveClass('progressive-image--high-quality');
      }, { timeout: 200 });
    });
  });
});