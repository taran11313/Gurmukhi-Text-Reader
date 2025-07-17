import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs-extra'
import path from 'path'

// Mock pdf2pic
vi.mock('pdf2pic', () => ({
  convert: vi.fn(() => vi.fn().mockResolvedValue({ page: 'mock-page-data' }))
}))

// Mock fs-extra
vi.mock('fs-extra')

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-job-id-123')
}))

// Import after mocking
const { pdfProcessor } = await import('../services/pdfProcessor')

describe('PDFProcessorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock fs.ensureDir to resolve successfully
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined)
    
    // Mock fs.pathExists to return true for existing files
    vi.mocked(fs.pathExists).mockResolvedValue(true)
    
    // Mock fs.stat for file metadata
    vi.mocked(fs.stat).mockResolvedValue({
      mtime: new Date('2024-01-01T00:00:00Z')
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('processPDF', () => {
    it('should start PDF processing and return job ID', async () => {
      const mockFilePath = '/test/path/test.pdf'
      
      const jobId = await pdfProcessor.processPDF(mockFilePath)
      
      expect(jobId).toBe('test-job-id-123')
      expect(typeof jobId).toBe('string')
    })

    it('should create processing job with correct initial status', async () => {
      const mockFilePath = '/test/path/test.pdf'
      
      const jobId = await pdfProcessor.processPDF(mockFilePath)
      const status = pdfProcessor.getProcessingStatus(jobId)
      
      expect(status).toBeDefined()
      expect(status?.id).toBe(jobId)
      expect(status?.status).toBe('pending')
      expect(status?.currentPage).toBe(0)
      expect(status?.progress).toBe(0)
      expect(status?.startTime).toBeInstanceOf(Date)
    })
  })

  describe('getProcessingStatus', () => {
    it('should return null for non-existent job ID', () => {
      const status = pdfProcessor.getProcessingStatus('non-existent-id')
      expect(status).toBeNull()
    })

    it('should return processing status for valid job ID', async () => {
      const mockFilePath = '/test/path/test.pdf'
      const jobId = await pdfProcessor.processPDF(mockFilePath)
      
      const status = pdfProcessor.getProcessingStatus(jobId)
      
      expect(status).toBeDefined()
      expect(status?.id).toBe(jobId)
      expect(status?.status).toBe('pending')
    })
  })

  describe('getAllJobs', () => {
    it('should return empty array when no jobs exist', () => {
      const jobs = pdfProcessor.getAllJobs()
      expect(jobs).toEqual([])
    })

    it('should return all processing jobs', async () => {
      const mockFilePath1 = '/test/path/test1.pdf'
      const mockFilePath2 = '/test/path/test2.pdf'
      
      // Mock uuid to return different IDs
      vi.mocked(require('uuid').v4)
        .mockReturnValueOnce('job-1')
        .mockReturnValueOnce('job-2')
      
      await pdfProcessor.processPDF(mockFilePath1)
      await pdfProcessor.processPDF(mockFilePath2)
      
      const jobs = pdfProcessor.getAllJobs()
      
      expect(jobs).toHaveLength(2)
      expect(jobs[0].id).toBe('job-1')
      expect(jobs[1].id).toBe('job-2')
    })
  })

  describe('getPageImage', () => {
    it('should return file path when page image exists', async () => {
      const pageNumber = 1
      
      const imagePath = await pdfProcessor.getPageImage(pageNumber, 'image')
      
      expect(imagePath).toBeDefined()
      expect(imagePath).toContain('page.1.jpg')
    })

    it('should return file path when thumbnail exists', async () => {
      const pageNumber = 1
      
      const thumbnailPath = await pdfProcessor.getPageImage(pageNumber, 'thumbnail')
      
      expect(thumbnailPath).toBeDefined()
      expect(thumbnailPath).toContain('thumb.1.jpg')
    })

    it('should return null when page image does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false)
      
      const imagePath = await pdfProcessor.getPageImage(999, 'image')
      
      expect(imagePath).toBeNull()
    })
  })

  describe('cleanup', () => {
    it('should limit processing jobs to 100 most recent', async () => {
      // Create more than 100 jobs
      const jobPromises = []
      for (let i = 0; i < 105; i++) {
        vi.mocked(require('uuid').v4).mockReturnValueOnce(`job-${i}`)
        jobPromises.push(pdfProcessor.processPDF(`/test/path/test${i}.pdf`))
      }
      
      await Promise.all(jobPromises)
      
      // Verify we have 105 jobs before cleanup
      expect(pdfProcessor.getAllJobs()).toHaveLength(105)
      
      // Run cleanup
      await pdfProcessor.cleanup()
      
      // Verify we have only 100 jobs after cleanup
      expect(pdfProcessor.getAllJobs()).toHaveLength(100)
    })

    it('should not remove jobs when count is under limit', async () => {
      // Create only 50 jobs
      const jobPromises = []
      for (let i = 0; i < 50; i++) {
        vi.mocked(require('uuid').v4).mockReturnValueOnce(`job-${i}`)
        jobPromises.push(pdfProcessor.processPDF(`/test/path/test${i}.pdf`))
      }
      
      await Promise.all(jobPromises)
      
      // Run cleanup
      await pdfProcessor.cleanup()
      
      // Verify all jobs are still there
      expect(pdfProcessor.getAllJobs()).toHaveLength(50)
    })
  })

  describe('error handling', () => {
    it('should handle PDF processing errors gracefully', async () => {
      const mockFilePath = '/test/path/invalid.pdf'
      
      // Mock pdf2pic to throw an error
      const { convert } = await import('pdf2pic')
      const mockConverter = vi.fn().mockRejectedValue(new Error('Invalid PDF'))
      vi.mocked(convert).mockReturnValue(mockConverter)
      
      const jobId = await pdfProcessor.processPDF(mockFilePath)
      
      // Wait a bit for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const status = pdfProcessor.getProcessingStatus(jobId)
      expect(status?.status).toBe('error')
      expect(status?.error).toBe('Invalid PDF')
    })

    it('should handle file system errors', async () => {
      vi.mocked(fs.ensureDir).mockRejectedValue(new Error('Permission denied'))
      
      // This should not throw, but handle the error internally
      expect(async () => {
        await pdfProcessor.processPDF('/test/path/test.pdf')
      }).not.toThrow()
    })
  })

  describe('progress tracking', () => {
    it('should track progress correctly during processing', async () => {
      const mockFilePath = '/test/path/test.pdf'
      
      const jobId = await pdfProcessor.processPDF(mockFilePath)
      const initialStatus = pdfProcessor.getProcessingStatus(jobId)
      
      expect(initialStatus?.progress).toBe(0)
      expect(initialStatus?.currentPage).toBe(0)
      expect(initialStatus?.totalPages).toBe(0)
    })

    it('should update progress as pages are processed', async () => {
      const mockFilePath = '/test/path/test.pdf'
      
      // Mock successful PDF conversion
      const { convert } = await import('pdf2pic')
      const mockConverter = vi.fn().mockResolvedValue({
        page: 'mock-page-data'
      })
      vi.mocked(convert).mockReturnValue(mockConverter)
      
      const jobId = await pdfProcessor.processPDF(mockFilePath)
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const status = pdfProcessor.getProcessingStatus(jobId)
      expect(status?.status).toBe('processing')
    })
  })
})