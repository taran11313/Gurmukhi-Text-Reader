import request from 'supertest'
import app from '../index'
import { UserSessionRepository } from '../repositories/UserSessionRepository'
import { AppConfigRepository } from '../repositories/AppConfigRepository'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import db from '../config/database'

describe('Navigation Routes', () => {
  let userSessionRepository: UserSessionRepository
  let appConfigRepository: AppConfigRepository

  beforeEach(async () => {
    // Clean up test data before each test
    await db('pages').del()
    await db('user_sessions').del()
    await db('app_config').del()
    
    userSessionRepository = new UserSessionRepository()
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
  })

  describe('GET /api/navigation', () => {
    it('should return navigation metadata without session', async () => {
      const response = await request(app)
        .get('/api/navigation')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        navigation: {
          totalPages: 100,
          currentPage: 1,
          bookmarks: [],
          hasSession: false,
          sessionId: null,
          processing: {
            isComplete: false,
            processedPages: 0,
            totalPages: 100
          },
          limits: {
            minPage: 1,
            maxPage: 100
          }
        }
      })
    })

    it('should return navigation metadata with session', async () => {
      // Create a test session
      const sessionId = 'test-session-123'
      await userSessionRepository.create({
        sessionId,
        currentPage: 25,
        bookmarks: [10, 20, 30]
      })

      const response = await request(app)
        .get('/api/navigation')
        .set('x-session-id', sessionId)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        navigation: {
          totalPages: 100,
          currentPage: 25,
          bookmarks: [10, 20, 30],
          hasSession: true,
          sessionId: sessionId
        }
      })
    })

    it('should set appropriate cache headers', async () => {
      const response = await request(app)
        .get('/api/navigation')
        .expect(200)

      expect(response.headers['cache-control']).toBe('public, max-age=300')
      expect(response.headers['etag']).toMatch(/^"nav-\d+"$/)
    })
  })

  describe('POST /api/navigation/bookmark', () => {
    it('should create new session with current page', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({
          currentPage: 42
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        session: {
          currentPage: 42,
          bookmarks: []
        },
        message: 'Session state saved successfully'
      })

      expect(response.body.session.sessionId).toBeDefined()
    })

    it('should create new session with bookmarks', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({
          currentPage: 15,
          bookmarks: [5, 10, 15, 20]
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        session: {
          currentPage: 15,
          bookmarks: [5, 10, 15, 20]
        }
      })
    })

    it('should update existing session', async () => {
      const sessionId = 'existing-session-456'
      await userSessionRepository.create({
        sessionId,
        currentPage: 10,
        bookmarks: [5]
      })

      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({
          sessionId,
          currentPage: 25,
          bookmarks: [5, 15, 25]
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        session: {
          sessionId,
          currentPage: 25,
          bookmarks: [5, 15, 25]
        }
      })
    })

    it('should validate current page number', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({
          currentPage: -5
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid current page',
        message: 'Current page must be a positive integer'
      })
    })

    it('should validate current page against total pages', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({
          currentPage: 150 // Greater than totalPages (100)
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid page number',
        message: 'Page number cannot exceed total pages (100)'
      })
    })

    it('should validate bookmarks array', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({
          currentPage: 10,
          bookmarks: [5, -2, 'invalid']
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid bookmarks',
        message: 'Bookmarks must be an array of positive integers'
      })
    })

    it('should validate bookmark page numbers against total pages', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({
          currentPage: 10,
          bookmarks: [5, 150, 200] // Some exceed totalPages (100)
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid bookmark pages',
        message: 'Bookmark pages cannot exceed total pages (100): 150, 200'
      })
    })

    it('should set no-cache headers', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({
          currentPage: 10
        })
        .expect(200)

      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate')
      expect(response.headers['pragma']).toBe('no-cache')
      expect(response.headers['expires']).toBe('0')
    })
  })

  describe('GET /api/navigation/session/:sessionId', () => {
    it('should return session information', async () => {
      const sessionId = 'test-session-789'
      await userSessionRepository.create({
        sessionId,
        currentPage: 33,
        bookmarks: [10, 20, 33]
      })

      const response = await request(app)
        .get(`/api/navigation/session/${sessionId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        session: {
          sessionId,
          currentPage: 33,
          bookmarks: [10, 20, 33]
        }
      })

      expect(response.body.session.lastVisited).toBeDefined()
    })

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/navigation/session/non-existent-session')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Session not found',
        message: 'No session found with ID: non-existent-session'
      })
    })

    it('should validate session ID parameter', async () => {
      const response = await request(app)
        .get('/api/navigation/session/')
        .expect(404) // Route not found
    })

    it('should set appropriate cache headers', async () => {
      const sessionId = 'cache-test-session'
      await userSessionRepository.create({
        sessionId,
        currentPage: 1
      })

      const response = await request(app)
        .get(`/api/navigation/session/${sessionId}`)
        .expect(200)

      expect(response.headers['cache-control']).toBe('private, max-age=60')
      expect(response.headers['etag']).toMatch(/^"session-.*"$/)
    })
  })

  describe('DELETE /api/navigation/session/:sessionId', () => {
    it('should delete existing session', async () => {
      const sessionId = 'delete-test-session'
      await userSessionRepository.create({
        sessionId,
        currentPage: 1
      })

      const response = await request(app)
        .delete(`/api/navigation/session/${sessionId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Session deleted successfully'
      })

      // Verify session is deleted
      const session = await userSessionRepository.findBySessionId(sessionId)
      expect(session).toBeUndefined()
    })

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .delete('/api/navigation/session/non-existent-session')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Session not found',
        message: 'No session found with ID: non-existent-session'
      })
    })
  })

  describe('Error handling', () => {
    it('should handle invalid session gracefully', async () => {
      // Test with a malformed session ID that doesn't exist
      const response = await request(app)
        .get('/api/navigation')
        .set('x-session-id', 'non-existent-session')
        .expect(200) // Should still return 200 with default values

      expect(response.body).toMatchObject({
        success: true,
        navigation: {
          totalPages: 100,
          currentPage: 1, // Default value when session not found
          bookmarks: [],
          hasSession: true, // Header was provided
          sessionId: 'non-existent-session'
        }
      })
    })
  })
})