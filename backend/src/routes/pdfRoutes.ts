import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import { pdfProcessor } from '../services/pdfProcessor'

const router = express.Router()

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'pdfs')
    await fs.ensureDir(uploadDir)
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `pdf-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for large PDFs
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'))
    }
  }
})

// POST /api/pdf/upload - Upload and start processing PDF
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No PDF file uploaded',
        message: 'Please provide a PDF file to process'
      })
    }

    const filePath = req.file.path
    console.log(`Starting PDF processing for: ${req.file.originalname}`)

    // Start processing
    const jobId = await pdfProcessor.processPDF(filePath)

    return res.json({
      success: true,
      message: 'PDF upload successful, processing started',
      jobId,
      filename: req.file.originalname,
      fileSize: req.file.size
    })

  } catch (error) {
    console.error('PDF upload error:', error)
    res.status(500).json({
      error: 'Failed to process PDF',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// GET /api/pdf/status/:jobId - Get processing status
router.get('/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params
    const status = pdfProcessor.getProcessingStatus(jobId)

    if (!status) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'The specified processing job does not exist'
      })
    }

    return res.json({
      success: true,
      status: {
        id: status.id,
        status: status.status,
        progress: status.progress,
        currentPage: status.currentPage,
        totalPages: status.totalPages,
        startTime: status.startTime,
        endTime: status.endTime,
        error: status.error,
        estimatedTimeRemaining: calculateEstimatedTime(status)
      }
    })

  } catch (error) {
    console.error('Status check error:', error)
    res.status(500).json({
      error: 'Failed to get processing status',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// GET /api/pdf/jobs - Get all processing jobs (admin endpoint)
router.get('/jobs', (_req, res) => {
  try {
    const jobs = pdfProcessor.getAllJobs()
    
    res.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentPage: job.currentPage,
        totalPages: job.totalPages,
        startTime: job.startTime,
        endTime: job.endTime,
        error: job.error
      }))
    })

  } catch (error) {
    console.error('Jobs list error:', error)
    res.status(500).json({
      error: 'Failed to get processing jobs',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// Helper function to calculate estimated time remaining
function calculateEstimatedTime(status: any): string | null {
  if (status.status !== 'processing' || status.progress === 0) {
    return null
  }

  const elapsed = Date.now() - status.startTime.getTime()
  const progressRatio = status.progress / 100
  const estimatedTotal = elapsed / progressRatio
  const remaining = estimatedTotal - elapsed

  if (remaining <= 0) return null

  const minutes = Math.ceil(remaining / (1000 * 60))
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours !== 1 ? 's' : ''}`
}

export default router