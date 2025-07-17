import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PageRepository } from '../../repositories/PageRepository'
import db from '../../config/database'

describe('PageRepository', () => {
  let pageRepo: PageRepository

  beforeEach(async () => {
    pageRepo = new PageRepository()
    // Clean up test data
    await db('pages').del()
  })

  afterEach(async () => {
    await db('pages').del()
  })

  it('should create a new page', async () => {
    const pageData = {
      pageNumber: 1,
      imageUrl: '/images/page-1.jpg',
      thumbnailUrl: '/images/thumb-1.jpg',
      width: 800,
      height: 1200
    }

    const page = await pageRepo.create(pageData)
    
    expect(page).toBeDefined()
    expect(page.pageNumber).toBe(1)
    expect(page.imageUrl).toBe('/images/page-1.jpg')
    expect(page.processedAt).toBeInstanceOf(Date)
  })

  it('should find page by page number', async () => {
    const pageData = {
      pageNumber: 5,
      imageUrl: '/images/page-5.jpg',
      thumbnailUrl: '/images/thumb-5.jpg',
      width: 800,
      height: 1200
    }

    await pageRepo.create(pageData)
    const foundPage = await pageRepo.findByPageNumber(5)
    
    expect(foundPage).toBeDefined()
    expect(foundPage?.pageNumber).toBe(5)
  })

  it('should get total pages count', async () => {
    await pageRepo.create({
      pageNumber: 1,
      imageUrl: '/images/page-1.jpg',
      thumbnailUrl: '/images/thumb-1.jpg',
      width: 800,
      height: 1200
    })
    
    await pageRepo.create({
      pageNumber: 2,
      imageUrl: '/images/page-2.jpg',
      thumbnailUrl: '/images/thumb-2.jpg',
      width: 800,
      height: 1200
    })

    const totalPages = await pageRepo.getTotalPages()
    expect(totalPages).toBe(2)
  })

  it('should get page range', async () => {
    // Create test pages
    for (let i = 1; i <= 5; i++) {
      await pageRepo.create({
        pageNumber: i,
        imageUrl: `/images/page-${i}.jpg`,
        thumbnailUrl: `/images/thumb-${i}.jpg`,
        width: 800,
        height: 1200
      })
    }

    const pages = await pageRepo.getPageRange(2, 4)
    expect(pages).toHaveLength(3)
    expect(pages[0].pageNumber).toBe(2)
    expect(pages[2].pageNumber).toBe(4)
  })
})