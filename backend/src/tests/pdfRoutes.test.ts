import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import pdfRoutes from '../routes/pdfRoutes'
import { pdfProcessor } from '../services/pdfProcessor'

// Mock the PDF processor service
vi.mock('../services/pdfProcessor', () => ({
  pdfProcessor: {
    processPDF: vi.fn(),
    getProcessingStatus: vi.fn(),
    getAllJobs: vi.fn()
  }
}))

// Mock multer for file uploads
vi.mock('multer', () => {
  const multer = vi.fn(() => ({
    single: vi.fn(() => (req: any, res: any, next: any) => {
      // Mock successful file upload
      req.file = {
        path: '/mock/path/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      }
      next()
    })
  }))
  
  multer.diskStorage = vi.fn(() => ({}))
  
  return { default: multer }
})

describe('PDF Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/pdf', pdfRoutes)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/pdf/upload', () => {
    it('should successfully upload and start processing PDF', async () => {
      const mockJobId = 'test-job-123'
      vi.mocked(pdfProcessor.processPDF).mockResolvedValue(mockJobId)

      const response = await request(app)
        .post('/api/pdf/upload')
        .attach('pdf', Buffer.from('mock pdf content'), 'test.pdf')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        message: 'PDF upload successful, processing started',
        jobId: mockJobId,
        filename: 'test.pdf',
        fileSize: 1024000
      })
      
      expect(pdfProcessor.processPDF).toHaveBeenCalledWith('/mock/path/test.pdf')
    })

    it('should return error when no file is uploaded', async () => {
      // Mock multer to not provide a file
      const mockMulter = await import('multer')
      vi.mocked(mockMulter.default).mockReturnValue({
        single: vi.fn(() => (req: any, res: any, next: any) => {
          // No file attached
          next()
        })
      } as any)

      const response = await request(app)
        .post('/api/pdf/upload')

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: 'No PDF file uploaded',
        message: 'Please provide a PDF file to process'
      })
    })

    it('should handle processing errors', async () => {
      vi.mocked(pdfProcessor.processPDF).mockRejectedValue(new Error('Processing failed'))

      const response = await request(app)
        .post('/api/pdf/upload')
        .attach('pdf', Buffer.from('mock pdf content'), 'test.pdf')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        error: 'Failed to process PDF',
        message: 'Processing failed'
      })
    })
  })

  describe('GET /api/pdf/status/:jobId', () => {
    it('should return processing status for valid job ID', async () => {
      const mockStatus = {
        id: 'test-job-123',
        status: 'processing' as const,
        progress: 50,
        currentPage: 500,
        totalPages: 1000,
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: undefined,
        error: undefined
      }

      vi.mocked(pdfProcessor.getProcessingStatus).mockReturnValue(mockStatus)

      const response = await request(app)
        .get('/api/pdf/status/test-job-123')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.status).toEqual({
        id: 'test-job-123',
        status: 'processing',
        progress: 50,
        currentPage: 500,
        totalPages: 1000,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: undefined,
        error: undefined,
        estimatedTimeRemaining: expect.any(String)
      })
    })

    it('should return 404 for non-existent job ID', async () => {
      vi.mocked(pdfProcessor.getProcessingStatus).mockReturnValue(null)

      const response = await request(app)
        .get('/api/pdf/status/non-existent-job')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        error: 'Job not found',
        message: 'The specified processing job does not exist'
      })
    })

    it('should return completed status', async () => {
      const mockStatus = {
        id: 'test-job-123',
        status: 'completed' as const,
        progress: 100,
        currentPage: 1000,
        totalPages: 1000,
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-01T01:00:00Z'),
        error: undefined
      }

      vi.mocked(pdfProcessor.getProcessingStatus).mockReturnValue(mockStatus)

      const response = await request(app)
        .get('/api/pdf/status/test-job-123')

      expect(response.status).toBe(200)
      expect(response.body.status.status).toBe('completed')
      expect(response.body.status.progress).toBe(100)
      expect(response.body.status.estimatedTimeRemaining).toBeNull()
    })

    it('should return error status', async () => {
      const mockStatus = {
        id: 'test-job-123',
        status: 'error' as const,
        progress: 25,
        currentPage: 250,
        totalPages: 1000,
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-01T00:30:00Z'),
        error: 'PDF processing failed'
      }

      vi.mocked(pdfProcessor.getProcessingStatus).mockReturnValue(mockStatus)

      const response = await request(app)
        .get('/api/pdf/status/test-job-123')

      expect(response.status).toBe(200)
      expect(response.body.status.status).toBe('error')
      expect(response.body.status.error).toBe('PDF processing failed')
    })
  })

  describe('GET /api/pdf/jobs', () => {
    it('should return all processing jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'completed' as const,
          progress: 100,
          currentPage: 1000,
          totalPages: 1000,
          startTime: new Date('2024-01-01T00:00:00Z'),
          endTime: new Date('2024-01-01T01:00:00Z'),
          error: undefined
        },
        {
          id: 'job-2',
          status: 'processing' as const,
          progress: 50,
          currentPage: 500,
          totalPages: 1000,
          startTime: new Date('2024-01-01T02:00:00Z'),
          endTime: undefined,
          error: undefined
        }
      ]

      vi.mocked(pdfProcessor.getAllJobs).mockReturnValue(mockJobs)

      const response = await request(app)
        .get('/api/pdf/jobs')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.jobs).toHaveLength(2)
      expect(response.body.jobs[0].id).toBe('job-1')
      expect(response.body.jobs[1].id).toBe('job-2')
    })

    it('should return empty array when no jobs exist', async () => {
      vi.mocked(pdfProcessor.getAllJobs).mockReturnValue([])

      const response = await request(app)
        .get('/api/pdf/jobs')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.jobs).toEqual([])
    })

    it('should handle service errors', async () => {
      vi.mocked(pdfProcessor.getAllJobs).mockImplementation(() => {
        throw new Error('Service unavailable')
      })

      const response = await request(app)
        .get('/api/pdf/jobs')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        error: 'Failed to get processing jobs',
        message: 'Service unavailable'
      })
    })
  })

  describe('Time estimation', () => {
    it('should calculate estimated time remaining correctly', async () => {
      const startTime = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      const mockStatus = {
        id: 'test-job-123',
        status: 'processing' as const,
        progress: 25, // 25% complete
        currentPage: 250,
        totalPages: 1000,
        startTime,
        endTime: undefined,
        error: undefined
      }

      vi.mocked(pdfProcessor.getProcessingStatus).mockReturnValue(mockStatus)

      const response = await request(app)
        .get('/api/pdf/status/test-job-123')

      expect(response.status).toBe(200)
      expect(response.body.status.estimatedTimeRemaining).toBeDefined()
      expect(typeof response.body.status.estimatedTimeRemaining).toBe('string')
    })

    it('should return null for estimated time when progress is 0', async () => {
      const mockStatus = {
        id: 'test-job-123',
        status: 'processing' as const,
        progress: 0,
        currentPage: 0,
        totalPages: 1000,
        startTime: new Date(),
        endTime: undefined,
        error: undefined
      }

      vi.mocked(pdfProcessor.getProcessingStatus).mockReturnValue(mockStatus)

      const response = await request(app)
        .get('/api/pdf/status/test-job-123')

      expect(response.status).toBe(200)
      expect(response.body.status.estimatedTimeRemaining).toBeNull()
    })
  })
})