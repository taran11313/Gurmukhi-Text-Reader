import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { UserSessionRepository } from '../../repositories/UserSessionRepository'
import db from '../../config/database'

describe('UserSessionRepository', () => {
  let sessionRepo: UserSessionRepository

  beforeEach(async () => {
    sessionRepo = new UserSessionRepository()
    // Clean up test data
    await db('user_sessions').del()
  })

  afterEach(async () => {
    await db('user_sessions').del()
  })

  it('should create a new user session', async () => {
    const sessionData = {
      sessionId: 'test-session-123',
      currentPage: 1,
      bookmarks: [5, 10, 15]
    }

    const session = await sessionRepo.create(sessionData)
    
    expect(session).toBeDefined()
    expect(session.sessionId).toBe('test-session-123')
    expect(session.currentPage).toBe(1)
    expect(session.bookmarks).toEqual([5, 10, 15])
    expect(session.lastVisited).toBeInstanceOf(Date)
  })

  it('should find session by session ID', async () => {
    const sessionData = {
      sessionId: 'find-test-session',
      currentPage: 25,
      bookmarks: [1, 2, 3]
    }

    await sessionRepo.create(sessionData)
    const foundSession = await sessionRepo.findBySessionId('find-test-session')
    
    expect(foundSession).toBeDefined()
    expect(foundSession?.currentPage).toBe(25)
    expect(foundSession?.bookmarks).toEqual([1, 2, 3])
  })

  it('should update existing session', async () => {
    const sessionId = 'update-test-session'
    
    await sessionRepo.create({
      sessionId,
      currentPage: 1,
      bookmarks: []
    })

    const updatedSession = await sessionRepo.update(sessionId, {
      currentPage: 50,
      bookmarks: [10, 20, 30]
    })
    
    expect(updatedSession).toBeDefined()
    expect(updatedSession?.currentPage).toBe(50)
    expect(updatedSession?.bookmarks).toEqual([10, 20, 30])
  })

  it('should upsert session (create if not exists)', async () => {
    const sessionId = 'upsert-new-session'
    
    const session = await sessionRepo.upsert(sessionId, {
      currentPage: 15
    })
    
    expect(session).toBeDefined()
    expect(session.sessionId).toBe(sessionId)
    expect(session.currentPage).toBe(15)
  })

  it('should upsert session (update if exists)', async () => {
    const sessionId = 'upsert-existing-session'
    
    // Create initial session
    await sessionRepo.create({
      sessionId,
      currentPage: 1,
      bookmarks: []
    })
    
    // Upsert should update
    const updatedSession = await sessionRepo.upsert(sessionId, {
      currentPage: 99
    })
    
    expect(updatedSession).toBeDefined()
    expect(updatedSession.currentPage).toBe(99)
  })
})