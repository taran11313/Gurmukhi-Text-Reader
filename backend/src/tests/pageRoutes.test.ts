import request from 'supertest'
import app from '../index'
import { PageRepository } from '../repositories/PageRepository'
import { AppConfigRepository } from '../repositories/AppConfigRepository'
import fs from 'fs-extra'
import path from 'path'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import db from '../config/database'

// Mock the pdfProcessor service
vi.mock('../services/pdfProcessor', () => ({
  pdfProcessor: {
    getPageImage: vi.fn()
  }
}))

import { pdfProcessor } from '../services/pdfProcessor'

describe('Page Routes', () => {
  let pageRepository: PageRepository
  let appConfigRepository: AppConfigRepository

  beforeEach(async () => {
    // Clean up test data before each test
    await db('pages').del()
    await db('user_sessions').del()
    await db('app_config').del()
    
    pageRepository = new PageRepository()
    appConfigRepository = new AppConfigRepository()
    
    // Set up test app config
    await appConfigRepository.create({
      totalPages: 100,
      title: 'Test Punjabi Reader',
      theme: {
        primaryColor: '#FF9933',
        secondaryColor: '#1B365D',
        backgroundColor: '#FAF7F0',
        fontFamily: 'Noto Sans Gurmukhi'
      }
    })

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('GET /api/pages/:pageNumber', () => {
    it('should return page metadata for valid page', async () => {
      // Mock page data in database
      await pageRepository.create({
        pageNumber: 1,
        imageUrl: '/api/pages/1/image',
        thumbnailUrl: '/api/pages/1/thumbnail',
        width: 1200,
        height: 1600
      })

      // Mock file system checks
      vi.mocked(pdfProcessor.getPageImage)
        .mockResolvedValueOnce('/path/to/image.jpg') // image
        .mockResolvedValueOnce('/path/to/thumb.jpg') // thumbnail

      const response = await request(app)
        .get('/api/pages/1')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        page: {
          pageNumber: 1,
          imageUrl: '/api/pages/1/image',
          thumbnailUrl: '/api/pages/1/thumbnail',
          width: 1200,
          height: 1600,
          hasImage: true,
          hasThumbnail: true,
          metadata: {
            totalPages: 100,
            isFirstPage: true,
            isLastPage: false,
            hasNext: true,
            hasPrevious: false
          }
        }
      })
    })

    it('should return metadata for last page', async () => {
      await pageRepository.create({
        pageNumber: 100,
        imageUrl: '/api/pages/100/image',
        thumbnailUrl: '/api/pages/100/thumbnail',
        width: 1200,
        height: 1600
      })

      vi.mocked(pdfProcessor.getPageImage)
        .mockResolvedValueOnce('/path/to/image.jpg')
        .mockResolvedValueOnce('/path/to/thumb.jpg')

      const response = await request(app)
        .get('/api/pages/100')
        .expect(200)

      expect(response.body.page.metadata).toMatchObject({
        isFirstPage: false,
        isLastPage: true,
        hasNext: false,
        hasPrevious: true
      })
    })

    it('should validate page number format', async () => {
      const response = await request(app)
        .get('/api/pages/invalid')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid page number',
        message: 'Page number must be a positive integer'
      })
    })

    it('should validate negative page numbers', async () => {
      const response = await request(app)
        .get('/api/pages/-1')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid page number',
        message: 'Page number must be a positive integer'
      })
    })

    it('should validate page number against total pages', async () => {
      const response = await request(app)
        .get('/api/pages/150') // Greater than totalPages (100)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Page not found',
        message: 'Page 150 does not exist. Total pages: 100'
      })
    })

    it('should return 404 for unprocessed page', async () => {
      vi.mocked(pdfProcessor.getPageImage)
        .mockResolvedValueOnce(null) // no image
        .mockResolvedValueOnce(null) // no thumbnail

      const response = await request(app)
        .get('/api/pages/25')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Page not found',
        message: 'Page 25 has not been processed yet'
      })
    })

    it('should set appropriate cache headers', async () => {
      await pageRepository.create({
        pageNumber: 10,
        imageUrl: '/api/pages/10/image',
        thumbnailUrl: '/api/pages/10/thumbnail',
        width: 1200,
        height: 1600
      })

      vi.mocked(pdfProcessor.getPageImage)
        .mockResolvedValueOnce('/path/to/image.jpg')
        .mockResolvedValueOnce('/path/to/thumb.jpg')

      const response = await request(app)
        .get('/api/pages/10')
        .expect(200)

      expect(response.headers['cache-control']).toBe('public, max-age=3600')
      expect(response.headers['etag']).toBe('"page-meta-10"')
      expect(response.headers['last-modified']).toBeDefined()
    })
  })

  describe('GET /api/pages/:pageNumber/image', () => {
    it('should serve page image with proper headers', async () => {
      // Create a test image file
      const testImagePath = path.join(__dirname, 'test-image.jpg')
      await fs.writeFile(testImagePath, 'fake image data')

      vi.mocked(pdfProcessor.getPageImage)
        .mockResolvedValueOnce(testImagePath)

      const response = await request(app)
        .get('/api/pages/1/image')
        .expect(200)

      expect(response.headers['content-type']).toBe('image/jpeg')
      expect(response.headers['cache-control']).toBe('public, max-age=31536000')
      expect(response.headers['etag']).toBe('"page-1"')
      expect(response.headers['last-modified']).toBeDefined()

      // Clean up
      await fs.remove(testImagePath)
    })

    it('should return 404 for missing image', async () => {
      vi.mocked(pdfProcessor.getPageImage)
        .mockResolvedValueOnce(null)

      const response = await request(app)
        .get('/api/pages/1/image')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Image not found',
        message: 'Image for page 1 is not available'
      })
    })

    it('should validate page number for image requests', async () => {
      const response = await request(app)
        .get('/api/pages/invalid/image')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid page number',
        message: 'Page number must be a positive integer'
      })
    })
  })

  describe('GET /api/pages/:pageNumber/thumbnail', () => {
    it('should serve page thumbnail with proper headers', async () => {
      const testThumbPath = path.join(__dirname, 'test-thumb.jpg')
      await fs.writeFile(testThumbPath, 'fake thumbnail data')

      vi.mocked(pdfProcessor.getPageImage)
        .mockResolvedValueOnce(testThumbPath)

      const response = await request(app)
        .get('/api/pages/1/thumbnail')
        .expect(200)

      expect(response.headers['content-type']).toBe('image/jpeg')
      expect(response.headers['cache-control']).toBe('public, max-age=31536000')
      expect(response.headers['etag']).toBe('"thumb-1"')

      // Clean up
      await fs.remove(testThumbPath)
    })

    it('should return 404 for missing thumbnail', async () => {
      vi.mocked(pdfProcessor.getPageImage)
        .mockResolvedValueOnce(null)

      const response = await request(app)
        .get('/api/pages/1/thumbnail')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Thumbnail not found',
        message: 'Thumbnail for page 1 is not available'
      })
    })
  })

  describe('GET /api/pages/range/:start/:end', () => {
    it('should return page range metadata', async () => {
      // Mock file system checks for all pages
      vi.mocked(pdfProcessor.getPageImage)
        .mockResolvedValue('/path/to/file.jpg')

      const response = await request(app)
        .get('/api/pages/range/1/5')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        range: { start: 1, end: 5 },
        count: 5
      })

      expect(response.body.pages).toHaveLength(5)
      expect(response.body.pages[0]).toMatchObject({
        pageNumber: 1,
        hasImage: true,
        hasThumbnail: true
      })
    })

    it('should validate page range parameters', async () => {
      const response = await request(app)
        .get('/api/pages/range/invalid/5')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid page range',
        message: 'Start and end must be positive integers with start <= end'
      })
    })

    it('should limit range size', async () => {
      const response = await request(app)
        .get('/api/pages/range/1/100') // Range of 100 pages
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Range too large',
        message: 'Maximum range is 50 pages per request'
      })
    })

    it('should validate start <= end', async () => {
      const response = await request(app)
        .get('/api/pages/range/10/5')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid page range',
        message: 'Start and end must be positive integers with start <= end'
      })
    })
  })

  describe('Error handling', () => {
    it('should handle file system errors gracefully', async () => {
      vi.mocked(pdfProcessor.getPageImage)
        .mockRejectedValueOnce(new Error('File system error'))

      const response = await request(app)
        .get('/api/pages/1')
        .expect(500)

      expect(response.body).toMatchObject({
        error: 'Failed to get page information'
      })
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error by making the PDF processor fail and no page in database
      vi.mocked(pdfProcessor.getPageImage)
        .mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app)
        .get('/api/pages/1')
        .expect(500)

      expect(response.body).toMatchObject({
        error: 'Failed to get page information'
      })
    })
  })
})