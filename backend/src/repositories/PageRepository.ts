import db from '../config/database'
import { Page, CreatePageData, UpdatePageData } from '../models/Page'

export class PageRepository {
  private tableName = 'pages'

  async findAll(): Promise<Page[]> {
    const results = await db(this.tableName).select('*').orderBy('pageNumber')
    return results.map(result => ({
      ...result,
      processedAt: new Date(result.processedAt)
    }))
  }

  async findByPageNumber(pageNumber: number): Promise<Page | undefined> {
    const result = await db(this.tableName).where({ pageNumber }).first()
    if (result) {
      return {
        ...result,
        processedAt: new Date(result.processedAt)
      }
    }
    return undefined
  }

  async findById(id: number): Promise<Page | undefined> {
    const result = await db(this.tableName).where({ id }).first()
    if (result) {
      return {
        ...result,
        processedAt: new Date(result.processedAt)
      }
    }
    return undefined
  }

  async create(data: CreatePageData): Promise<Page> {
    const [result] = await db(this.tableName).insert({
      ...data,
      processedAt: new Date()
    })
    
    // For SQLite, the result is the row ID
    const id = typeof result === 'object' ? result.id : result
    const created = await this.findById(id)
    if (!created) {
      throw new Error('Failed to create page')
    }
    return created
  }

  async update(id: number, data: UpdatePageData): Promise<Page | undefined> {
    await db(this.tableName).where({ id }).update(data)
    return this.findById(id)
  }

  async delete(id: number): Promise<boolean> {
    const deletedRows = await db(this.tableName).where({ id }).del()
    return deletedRows > 0
  }

  async getTotalPages(): Promise<number> {
    const result = await db(this.tableName).count('id as count').first()
    return result?.count as number || 0
  }

  async getPageRange(startPage: number, endPage: number): Promise<Page[]> {
    const results = await db(this.tableName)
      .where('pageNumber', '>=', startPage)
      .andWhere('pageNumber', '<=', endPage)
      .orderBy('pageNumber')
    
    return results.map(result => ({
      ...result,
      processedAt: new Date(result.processedAt)
    }))
  }
}