import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { PageRepository } from '../repositories/PageRepository'
import { UserSessionRepository } from '../repositories/UserSessionRepository'
import { AppConfigRepository } from '../repositories/AppConfigRepository'

const router = express.Router()
const pageRepository = new PageRepository()
const userSessionRepository = new UserSessionRepository()
const appConfigRepository = new AppConfigRepository()

// GET /api/navigation - Get navigation metadata
router.get('/', async (req, res) => {
  try {
    // Set cache headers for navigation metadata
    res.set({
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      'ETag': `"nav-${Date.now()}"`,
    })

    // Get total pages from app config
    const appConfig = await appConfigRepository.getOrCreateDefault()
    const totalPages = appConfig.totalPages

    // Get session information if session ID is provided
    const sessionId = req.headers['x-session-id'] as string
    let currentPage = 1
    let bookmarks: number[] = []

    if (sessionId) {
      const session = await userSessionRepository.findBySessionId(sessionId)
      if (session) {
        currentPage = session.currentPage
        bookmarks = session.bookmarks || []
      }
    }

    // Get page processing status (check if pages exist)
    const processedPages = await pageRepository.getTotalPages()
    const isProcessingComplete = processedPages >= totalPages && totalPages > 0

    return res.json({
      success: true,
      navigation: {
        totalPages,
        currentPage,
        bookmarks,
        hasSession: !!sessionId,
        sessionId: sessionId || null,
        processing: {
          isComplete: isProcessingComplete,
          processedPages,
          totalPages
        },
        limits: {
          minPage: 1,
          maxPage: Math.max(totalPages, 1)
        }
      }
    })

  } catch (error) {
    console.error('Navigation metadata error:', error)
    res.status(500).json({
      error: 'Failed to get navigation information',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// POST /api/navigation/bookmark - Save session state and bookmarks
router.post('/bookmark', async (req, res) => {
  try {
    const { currentPage, bookmarks, sessionId: providedSessionId } = req.body

    // Validate input
    if (currentPage !== undefined && (typeof currentPage !== 'number' || currentPage < 1)) {
      return res.status(400).json({
        error: 'Invalid current page',
        message: 'Current page must be a positive integer'
      })
    }

    if (bookmarks !== undefined && (!Array.isArray(bookmarks) || !bookmarks.every(b => typeof b === 'number' && b > 0))) {
      return res.status(400).json({
        error: 'Invalid bookmarks',
        message: 'Bookmarks must be an array of positive integers'
      })
    }

    // Get or create session ID
    let sessionId = providedSessionId || req.headers['x-session-id'] as string
    if (!sessionId) {
      sessionId = uuidv4()
    }

    // Validate page number against total pages
    if (currentPage !== undefined) {
      const appConfig = await appConfigRepository.getOrCreateDefault()
      if (currentPage > appConfig.totalPages && appConfig.totalPages > 0) {
        return res.status(400).json({
          error: 'Invalid page number',
          message: `Page number cannot exceed total pages (${appConfig.totalPages})`
        })
      }
    }

    // Validate bookmark page numbers
    if (bookmarks !== undefined && bookmarks.length > 0) {
      const appConfig = await appConfigRepository.getOrCreateDefault()
      const invalidBookmarks = bookmarks.filter(b => b > appConfig.totalPages && appConfig.totalPages > 0)
      if (invalidBookmarks.length > 0) {
        return res.status(400).json({
          error: 'Invalid bookmark pages',
          message: `Bookmark pages cannot exceed total pages (${appConfig.totalPages}): ${invalidBookmarks.join(', ')}`
        })
      }
    }

    // Update or create session
    const sessionData: any = {}
    if (currentPage !== undefined) {
      sessionData.currentPage = currentPage
    }
    if (bookmarks !== undefined) {
      sessionData.bookmarks = bookmarks
    }

    const session = await userSessionRepository.upsert(sessionId, sessionData)

    // Set session cookie for future requests
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    return res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        currentPage: session.currentPage,
        bookmarks: session.bookmarks || [],
        lastVisited: session.lastVisited
      },
      message: 'Session state saved successfully'
    })

  } catch (error) {
    console.error('Bookmark save error:', error)
    res.status(500).json({
      error: 'Failed to save session state',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// GET /api/navigation/session/:sessionId - Get specific session information
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        error: 'Invalid session ID',
        message: 'Session ID must be a valid string'
      })
    }

    const session = await userSessionRepository.findBySessionId(sessionId)

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: `No session found with ID: ${sessionId}`
      })
    }

    // Set cache headers
    res.set({
      'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      'ETag': `"session-${sessionId}-${session.lastVisited.getTime()}"`,
    })

    return res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        currentPage: session.currentPage,
        bookmarks: session.bookmarks || [],
        lastVisited: session.lastVisited
      }
    })

  } catch (error) {
    console.error('Session retrieval error:', error)
    res.status(500).json({
      error: 'Failed to get session information',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// DELETE /api/navigation/session/:sessionId - Delete a session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        error: 'Invalid session ID',
        message: 'Session ID must be a valid string'
      })
    }

    const deleted = await userSessionRepository.delete(sessionId)

    if (!deleted) {
      return res.status(404).json({
        error: 'Session not found',
        message: `No session found with ID: ${sessionId}`
      })
    }

    return res.json({
      success: true,
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('Session deletion error:', error)
    res.status(500).json({
      error: 'Failed to delete session',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

export default router