import express from 'express'
import fs from 'fs-extra'
import { pdfProcessor } from '../services/pdfProcessor'
import { PageRepository } from '../repositories/PageRepository'
import { AppConfigRepository } from '../repositories/AppConfigRepository'

const router = express.Router()
const pageRepository = new PageRepository()
const appConfigRepository = new AppConfigRepository()

// GET /api/pages/:pageNumber - Get page metadata
router.get('/:pageNumber', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber)
    
    // Enhanced validation
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        error: 'Invalid page number',
        message: 'Page number must be a positive integer'
      })
    }

    // Check against total pages
    const appConfig = await appConfigRepository.getOrCreateDefault()
    if (pageNumber > appConfig.totalPages && appConfig.totalPages > 0) {
      return res.status(404).json({
        error: 'Page not found',
        message: `Page ${pageNumber} does not exist. Total pages: ${appConfig.totalPages}`
      })
    }

    // Check if page exists in database
    const pageData = await pageRepository.findByPageNumber(pageNumber)
    
    // Check if page image exists on filesystem
    const imagePath = await pdfProcessor.getPageImage(pageNumber, 'image')
    const thumbnailPath = await pdfProcessor.getPageImage(pageNumber, 'thumbnail')

    // For development: return placeholder data even if images don't exist
    if (!imagePath && !pageData) {
      console.log(`Page ${pageNumber} not processed yet, returning placeholder data`)
      
      return res.json({
        success: true,
        page: {
          pageNumber,
          imageUrl: `/api/pages/${pageNumber}/image`,
          thumbnailUrl: `/api/pages/${pageNumber}/thumbnail`,
          width: 1200,
          height: 1600,
          hasImage: false, // Indicate no actual image exists
          hasThumbnail: false,
          processedAt: null,
          metadata: {
            totalPages: appConfig.totalPages,
            isFirstPage: pageNumber === 1,
            isLastPage: pageNumber === appConfig.totalPages,
            hasNext: pageNumber < appConfig.totalPages,
            hasPrevious: pageNumber > 1
          }
        }
      })
    }

    // Set caching headers for page metadata
    res.set({
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'ETag': `"page-meta-${pageNumber}"`,
      'Last-Modified': pageData?.processedAt?.toUTCString() || new Date().toUTCString()
    })

    return res.json({
      success: true,
      page: {
        pageNumber,
        imageUrl: `/api/pages/${pageNumber}/image`,
        thumbnailUrl: `/api/pages/${pageNumber}/thumbnail`,
        width: pageData?.width || 1200,
        height: pageData?.height || 1600,
        hasImage: !!imagePath,
        hasThumbnail: !!thumbnailPath,
        processedAt: pageData?.processedAt || null,
        metadata: {
          totalPages: appConfig.totalPages,
          isFirstPage: pageNumber === 1,
          isLastPage: pageNumber === appConfig.totalPages,
          hasNext: pageNumber < appConfig.totalPages,
          hasPrevious: pageNumber > 1
        }
      }
    })

  } catch (error) {
    console.error('Page metadata error:', error)
    res.status(500).json({
      error: 'Failed to get page information',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// GET /api/pages/:pageNumber/image - Serve page image
router.get('/:pageNumber/image', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber)
    
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        error: 'Invalid page number',
        message: 'Page number must be a positive integer'
      })
    }

    const imagePath = await pdfProcessor.getPageImage(pageNumber, 'image')
    
    if (!imagePath || !(await fs.pathExists(imagePath))) {
      // For development: return a placeholder image instead of 404
      console.log(`Image for page ${pageNumber} not found, returning placeholder`)
      
      // Create a simple SVG placeholder
      const placeholderSvg = `
        <svg width="1200" height="1600" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FAF7F0"/>
          <rect x="100" y="100" width="1000" height="1400" fill="white" stroke="#FF9933" stroke-width="4"/>
          <text x="600" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#1B365D">
            Punjabi Religious Reader
          </text>
          <text x="600" y="500" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="#3C2415">
            Page ${pageNumber}
          </text>
          <text x="600" y="600" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#666">
            PDF processing in development mode
          </text>
          <text x="600" y="700" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#999">
            Install ImageMagick and Ghostscript for actual PDF conversion
          </text>
          <circle cx="600" cy="1000" r="100" fill="none" stroke="#FF9933" stroke-width="8"/>
          <text x="600" y="1010" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#FF9933">
            ੴ
          </text>
        </svg>
      `;
      
      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      });
      
      return res.send(placeholderSvg);
    }

    // Set appropriate headers for image caching
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'ETag': `"page-${pageNumber}"`,
      'Last-Modified': (await fs.stat(imagePath)).mtime.toUTCString()
    })

    // Stream the image file
    const imageStream = fs.createReadStream(imagePath)
    imageStream.pipe(res)

  } catch (error) {
    console.error('Image serving error:', error)
    res.status(500).json({
      error: 'Failed to serve image',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// GET /api/pages/:pageNumber/thumbnail - Serve page thumbnail
router.get('/:pageNumber/thumbnail', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber)
    
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        error: 'Invalid page number',
        message: 'Page number must be a positive integer'
      })
    }

    const thumbnailPath = await pdfProcessor.getPageImage(pageNumber, 'thumbnail')
    
    if (!thumbnailPath || !(await fs.pathExists(thumbnailPath))) {
      // For development: return a placeholder thumbnail instead of 404
      console.log(`Thumbnail for page ${pageNumber} not found, returning placeholder`)
      
      // Create a simple SVG thumbnail placeholder
      const placeholderSvg = `
        <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FAF7F0"/>
          <rect x="20" y="20" width="260" height="360" fill="white" stroke="#FF9933" stroke-width="2"/>
          <text x="150" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1B365D">
            Page ${pageNumber}
          </text>
          <text x="150" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#3C2415">
            Thumbnail
          </text>
          <circle cx="150" cy="250" r="30" fill="none" stroke="#FF9933" stroke-width="3"/>
          <text x="150" y="258" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#FF9933">
            ੴ
          </text>
        </svg>
      `;
      
      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      });
      
      return res.send(placeholderSvg);
    }

    // Set appropriate headers for thumbnail caching
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'ETag': `"thumb-${pageNumber}"`,
      'Last-Modified': (await fs.stat(thumbnailPath)).mtime.toUTCString()
    })

    // Stream the thumbnail file
    const thumbnailStream = fs.createReadStream(thumbnailPath)
    thumbnailStream.pipe(res)

  } catch (error) {
    console.error('Thumbnail serving error:', error)
    res.status(500).json({
      error: 'Failed to serve thumbnail',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// GET /api/pages/range/:start/:end - Get multiple pages metadata
router.get('/range/:start/:end', async (req, res) => {
  try {
    const start = parseInt(req.params.start)
    const end = parseInt(req.params.end)
    
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      return res.status(400).json({
        error: 'Invalid page range',
        message: 'Start and end must be positive integers with start <= end'
      })
    }

    if (end - start > 50) {
      return res.status(400).json({
        error: 'Range too large',
        message: 'Maximum range is 50 pages per request'
      })
    }

    const pages = []
    for (let pageNumber = start; pageNumber <= end; pageNumber++) {
      const imagePath = await pdfProcessor.getPageImage(pageNumber, 'image')
      const thumbnailPath = await pdfProcessor.getPageImage(pageNumber, 'thumbnail')
      
      pages.push({
        pageNumber,
        imageUrl: `/api/pages/${pageNumber}/image`,
        thumbnailUrl: `/api/pages/${pageNumber}/thumbnail`,
        width: 1200,
        height: 1600,
        hasImage: !!imagePath,
        hasThumbnail: !!thumbnailPath
      })
    }

    return res.json({
      success: true,
      pages,
      range: { start, end },
      count: pages.length
    })

  } catch (error) {
    console.error('Page range error:', error)
    res.status(500).json({
      error: 'Failed to get page range',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

export default router