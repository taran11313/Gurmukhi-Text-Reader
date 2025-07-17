import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PageRepository, UserSessionRepository, AppConfigRepository } from '../repositories'
import db from '../config/database'

describe('Database Integration', () => {
  let pageRepo: PageRepository
  let sessionRepo: UserSessionRepository
  let configRepo: AppConfigRepository

  beforeAll(async () => {
    pageRepo = new PageRepository()
    sessionRepo = new UserSessionRepository()
    configRepo = new AppConfigRepository()
    
    // Clean up test data
    await db('pages').del()
    await db('user_sessions').del()
    await db('app_config').del()
  })

  afterAll(async () => {
    // Clean up test data
    await db('pages').del()
    await db('user_sessions').del()
    await db('app_config').del()
  })

  it('should create and retrieve pages, sessions, and config', async () => {
    // Create app config
    const config = await configRepo.getOrCreateDefault()
    expect(config).toBeDefined()
    expect(config.title).toBe('Punjabi Religious Reader')

    // Create pages
    const page1 = await pageRepo.create({
      pageNumber: 1,
      imageUrl: '/images/page-1.jpg',
      thumbnailUrl: '/images/thumb-1.jpg',
      width: 800,
      height: 1200
    })

    const page2 = await pageRepo.create({
      pageNumber: 2,
      imageUrl: '/images/page-2.jpg',
      thumbnailUrl: '/images/thumb-2.jpg',
      width: 800,
      height: 1200
    })

    expect(page1.pageNumber).toBe(1)
    expect(page2.pageNumber).toBe(2)

    // Create user session
    const session = await sessionRepo.create({
      sessionId: 'integration-test-session',
      currentPage: 1,
      bookmarks: [1, 2]
    })

    expect(session.sessionId).toBe('integration-test-session')
    expect(session.currentPage).toBe(1)
    expect(session.bookmarks).toEqual([1, 2])

    // Update session
    const updatedSession = await sessionRepo.update('integration-test-session', {
      currentPage: 2,
      bookmarks: [1, 2, 5]
    })

    expect(updatedSession?.currentPage).toBe(2)
    expect(updatedSession?.bookmarks).toEqual([1, 2, 5])

    // Verify total pages
    const totalPages = await pageRepo.getTotalPages()
    expect(totalPages).toBe(2)

    // Update config
    const updatedConfig = await configRepo.update(config.id, {
      totalPages: 2
    })

    expect(updatedConfig?.totalPages).toBe(2)
  })

  it('should handle complex queries and relationships', async () => {
    // Create multiple pages
    for (let i = 3; i <= 10; i++) {
      await pageRepo.create({
        pageNumber: i,
        imageUrl: `/images/page-${i}.jpg`,
        thumbnailUrl: `/images/thumb-${i}.jpg`,
        width: 800,
        height: 1200
      })
    }

    // Test page range queries
    const pageRange = await pageRepo.getPageRange(5, 8)
    expect(pageRange).toHaveLength(4)
    expect(pageRange[0].pageNumber).toBe(5)
    expect(pageRange[3].pageNumber).toBe(8)

    // Test session upsert functionality
    const newSession = await sessionRepo.upsert('new-session', {
      currentPage: 5
    })
    expect(newSession.sessionId).toBe('new-session')
    expect(newSession.currentPage).toBe(5)

    // Update existing session via upsert
    const existingSession = await sessionRepo.upsert('new-session', {
      currentPage: 10,
      bookmarks: [5, 10]
    })
    expect(existingSession.currentPage).toBe(10)
    expect(existingSession.bookmarks).toEqual([5, 10])
  })
})