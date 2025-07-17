import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { Database } from '../database/Database'
import { PageRepository } from '../repositories/PageRepository'
import { UserSessionRepository } from '../repositories/UserSessionRepository'
import { AppConfigRepository } from '../repositories/AppConfigRepository'
import fs from 'fs-extra'
import path from 'path'

describe('Backend Integration Tests', () => {
  let database: Database
  let pageRepository: PageRepository
  let userSessionRepository: UserSessionRepository
  let appConfigRepository: AppConfigRepository

  beforeAll(async () => {
    // Initialize test database
    database = new Database(':memory:')
    await database.initialize()
    
    // Initialize repositories
    pageRepository = new PageRepository()
    userSessionRepository = new UserSessionRepository()
    appConfigRepository = new AppConfigRepository()
    
    // Set up test data
    await appConfigRepository.upsert({
      totalPages: 100,
      title: 'Test Punjabi Religious Reader',
      theme: {
        primaryColor: '#FF9933',
        secondaryColor: '#1B365D',
        backgroundColor: '#FAF7F0',
        fontFamily: 'Noto Sans Gurmukhi'
      }
    })
    
    // Create some test pages
    for (let i = 1; i <= 10; i++) {
      await pageRepository.create({
        pageNumber: i,
        imageUrl: `/api/pages/${i}/image`,
        thumbnailUrl: `/api/pages/${i}/thumbnail`,
        width: 1200,
        height: 1600,
        processedAt: new Date()
      })
    }
  })

  afterAll(async () => {
    await database.close()
  })

  beforeEach(async () => {
    // Clean up sessions before each test
    await userSessionRepository.deleteAll()
  })

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'ok',
        message: expect.any(String),
        timestamp: expect.any(String)
      })
    })
  })

  describe('Page API Endpoints', () => {
    it('should get page metadata', async () => {
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
          hasImage: expect.any(Boolean),
          hasThumbnail: expect.any(Boolean),
          processedAt: expect.any(String),
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

    it('should handle invalid page numbers', async () => {
      const response = await request(app)
        .get('/api/pages/0')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid page number',
        message: expect.any(String)
      })
    })

    it('should handle non-existent pages', async () => {
      const response = await request(app)
        .get('/api/pages/999')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Page not found',
        message: expect.stringContaining('999')
      })
    })

    it('should get page range metadata', async () => {
      const response = await request(app)
        .get('/api/pages/range/1/5')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        pages: expect.arrayContaining([
          expect.objectContaining({
            pageNumber: expect.any(Number),
            imageUrl: expect.any(String),
            thumbnailUrl: expect.any(String)
          })
        ]),
        range: { start: 1, end: 5 },
        count: 5
      })
    })

    it('should handle invalid page ranges', async () => {
      const response = await request(app)
        .get('/api/pages/range/5/1')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid page range',
        message: expect.any(String)
      })
    })

    it('should limit page range size', async () => {
      const response = await request(app)
        .get('/api/pages/range/1/100')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Range too large',
        message: expect.stringContaining('50')
      })
    })
  })

  describe('Navigation API Endpoints', () => {
    it('should get navigation metadata without session', async () => {
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
            isComplete: expect.any(Boolean),
            processedPages: expect.any(Number),
            totalPages: 100
          },
          limits: {
            minPage: 1,
            maxPage: 100
          }
        }
      })
    })

    it('should get navigation metadata with session', async () => {
      // Create a test session
      const session = await userSessionRepository.create({
        sessionId: 'test-session-123',
        currentPage: 5,
        bookmarks: [1, 3, 7],
        lastVisited: new Date()
      })

      const response = await request(app)
        .get('/api/navigation')
        .set('x-session-id', session.sessionId)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        navigation: {
          totalPages: 100,
          currentPage: 5,
          bookmarks: [1, 3, 7],
          hasSession: true,
          sessionId: 'test-session-123',
          processing: expect.any(Object),
          limits: expect.any(Object)
        }
      })
    })

    it('should save session state', async () => {
      const sessionData = {
        currentPage: 10,
        bookmarks: [1, 5, 10, 15]
      }

      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send(sessionData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        session: {
          sessionId: expect.any(String),
          currentPage: 10,
          bookmarks: [1, 5, 10, 15],
          lastVisited: expect.any(String)
        },
        message: 'Session state saved successfully'
      })
    })

    it('should update existing session', async () => {
      // Create initial session
      const initialResponse = await request(app)
        .post('/api/navigation/bookmark')
        .send({ currentPage: 5, bookmarks: [1, 2] })
        .expect(200)

      const sessionId = initialResponse.body.session.sessionId

      // Update session
      const updateResponse = await request(app)
        .post('/api/navigation/bookmark')
        .set('x-session-id', sessionId)
        .send({ currentPage: 10, bookmarks: [1, 2, 5, 10] })
        .expect(200)

      expect(updateResponse.body.session).toMatchObject({
        sessionId,
        currentPage: 10,
        bookmarks: [1, 2, 5, 10]
      })
    })

    it('should validate session data', async () => {
      const invalidData = {
        currentPage: -1,
        bookmarks: ['invalid', 'bookmarks']
      }

      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send(invalidData)
        .expect(400)

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String)
      })
    })

    it('should get specific session', async () => {
      // Create a session
      const createResponse = await request(app)
        .post('/api/navigation/bookmark')
        .send({ currentPage: 7, bookmarks: [1, 3, 7] })
        .expect(200)

      const sessionId = createResponse.body.session.sessionId

      // Retrieve the session
      const getResponse = await request(app)
        .get(`/api/navigation/session/${sessionId}`)
        .expect(200)

      expect(getResponse.body).toMatchObject({
        success: true,
        session: {
          sessionId,
          currentPage: 7,
          bookmarks: [1, 3, 7],
          lastVisited: expect.any(String)
        }
      })
    })

    it('should handle non-existent session', async () => {
      const response = await request(app)
        .get('/api/navigation/session/non-existent-session')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Session not found',
        message: expect.stringContaining('non-existent-session')
      })
    })

    it('should delete session', async () => {
      // Create a session
      const createResponse = await request(app)
        .post('/api/navigation/bookmark')
        .send({ currentPage: 5, bookmarks: [1, 5] })
        .expect(200)

      const sessionId = createResponse.body.session.sessionId

      // Delete the session
      await request(app)
        .delete(`/api/navigation/session/${sessionId}`)
        .expect(200)

      // Verify session is deleted
      await request(app)
        .get(`/api/navigation/session/${sessionId}`)
        .expect(404)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      await database.close()

      const response = await request(app)
        .get('/api/pages/1')
        .expect(500)

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String)
      })

      // Reinitialize database for other tests
      database = new Database(':memory:')
      await database.initialize()
    })

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400)

      expect(response.body).toMatchObject({
        error: expect.any(String)
      })
    })
  })

  describe('Caching Headers', () => {
    it('should set appropriate cache headers for page metadata', async () => {
      const response = await request(app)
        .get('/api/pages/1')
        .expect(200)

      expect(response.headers['cache-control']).toContain('public')
      expect(response.headers['etag']).toBeDefined()
      expect(response.headers['last-modified']).toBeDefined()
    })

    it('should set appropriate cache headers for navigation', async () => {
      const response = await request(app)
        .get('/api/navigation')
        .expect(200)

      expect(response.headers['cache-control']).toContain('public')
      expect(response.headers['etag']).toBeDefined()
    })

    it('should set no-cache headers for session operations', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({ currentPage: 1 })
        .expect(200)

      expect(response.headers['cache-control']).toContain('no-cache')
    })
  })

  describe('Session Management', () => {
    it('should handle concurrent session updates', async () => {
      // Create initial session
      const createResponse = await request(app)
        .post('/api/navigation/bookmark')
        .send({ currentPage: 1, bookmarks: [] })
        .expect(200)

      const sessionId = createResponse.body.session.sessionId

      // Simulate concurrent updates
      const updates = [
        request(app)
          .post('/api/navigation/bookmark')
          .set('x-session-id', sessionId)
          .send({ currentPage: 2 }),
        request(app)
          .post('/api/navigation/bookmark')
          .set('x-session-id', sessionId)
          .send({ bookmarks: [1, 2] }),
        request(app)
          .post('/api/navigation/bookmark')
          .set('x-session-id', sessionId)
          .send({ currentPage: 3, bookmarks: [1, 2, 3] })
      ]

      const responses = await Promise.all(updates)
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
    })

    it('should handle session cleanup', async () => {
      // Create multiple sessions
      const sessions = []
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/navigation/bookmark')
          .send({ currentPage: i + 1 })
          .expect(200)
        sessions.push(response.body.session.sessionId)
      }

      // Verify all sessions exist
      for (const sessionId of sessions) {
        await request(app)
          .get(`/api/navigation/session/${sessionId}`)
          .expect(200)
      }

      // Delete all sessions
      for (const sessionId of sessions) {
        await request(app)
          .delete(`/api/navigation/session/${sessionId}`)
          .expect(200)
      }

      // Verify all sessions are deleted
      for (const sessionId of sessions) {
        await request(app)
          .get(`/api/navigation/session/${sessionId}`)
          .expect(404)
      }
    })
  })

  describe('Data Validation', () => {
    it('should validate page numbers against total pages', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({ currentPage: 999 })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid page number',
        message: expect.stringContaining('100')
      })
    })

    it('should validate bookmark page numbers', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({ bookmarks: [1, 2, 999] })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid bookmark pages',
        message: expect.stringContaining('999')
      })
    })

    it('should handle empty bookmark arrays', async () => {
      const response = await request(app)
        .post('/api/navigation/bookmark')
        .send({ currentPage: 5, bookmarks: [] })
        .expect(200)

      expect(response.body.session.bookmarks).toEqual([])
    })
  })
})