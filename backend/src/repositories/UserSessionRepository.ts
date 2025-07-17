import db from '../config/database'
import { UserSession, CreateUserSessionData, UpdateUserSessionData } from '../models/UserSession'

export class UserSessionRepository {
  private tableName = 'user_sessions'

  async findBySessionId(sessionId: string): Promise<UserSession | undefined> {
    const result = await db(this.tableName).where({ sessionId }).first()
    if (result) {
      return {
        ...result,
        bookmarks: result.bookmarks ? JSON.parse(result.bookmarks) : [],
        lastVisited: new Date(result.lastVisited)
      }
    }
    return undefined
  }

  async create(data: CreateUserSessionData): Promise<UserSession> {
    await db(this.tableName).insert({
      sessionId: data.sessionId,
      currentPage: data.currentPage,
      bookmarks: data.bookmarks ? JSON.stringify(data.bookmarks) : null,
      lastVisited: new Date()
    })
    
    return this.findBySessionId(data.sessionId)!
  }

  async update(sessionId: string, data: UpdateUserSessionData): Promise<UserSession | undefined> {
    const updateData: any = {
      lastVisited: new Date()
    }
    
    if (data.currentPage !== undefined) {
      updateData.currentPage = data.currentPage
    }
    
    if (data.bookmarks !== undefined) {
      updateData.bookmarks = JSON.stringify(data.bookmarks)
    }
    
    await db(this.tableName).where({ sessionId }).update(updateData)
    return this.findBySessionId(sessionId)
  }

  async upsert(sessionId: string, data: CreateUserSessionData | UpdateUserSessionData): Promise<UserSession> {
    const existing = await this.findBySessionId(sessionId)
    
    if (existing) {
      const updated = await this.update(sessionId, data as UpdateUserSessionData)
      if (!updated) {
        throw new Error('Failed to update session')
      }
      return updated
    } else {
      return this.create({ sessionId, currentPage: 1, ...data } as CreateUserSessionData)
    }
  }

  async delete(sessionId: string): Promise<boolean> {
    const deletedRows = await db(this.tableName).where({ sessionId }).del()
    return deletedRows > 0
  }

  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    
    return db(this.tableName)
      .where('lastVisited', '<', cutoffDate)
      .del()
  }
}