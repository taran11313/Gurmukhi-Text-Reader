import db from '../config/database'
import { AppConfig, CreateAppConfigData, UpdateAppConfigData } from '../models/AppConfig'

export class AppConfigRepository {
  private tableName = 'app_config'

  async findCurrent(): Promise<AppConfig | undefined> {
    const result = await db(this.tableName).orderBy('id', 'desc').first()
    if (result) {
      return {
        ...result,
        theme: JSON.parse(result.theme),
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      }
    }
    return undefined
  }

  async create(data: CreateAppConfigData): Promise<AppConfig> {
    const [result] = await db(this.tableName).insert({
      totalPages: data.totalPages,
      title: data.title,
      theme: JSON.stringify(data.theme),
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    // For SQLite, the result is the row ID
    const id = typeof result === 'object' ? result.id : result
    const created = await this.findById(id)
    if (!created) {
      throw new Error('Failed to create app config')
    }
    return created
  }

  async findById(id: number): Promise<AppConfig | undefined> {
    const result = await db(this.tableName).where({ id }).first()
    if (result) {
      return {
        ...result,
        theme: JSON.parse(result.theme),
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      }
    }
    return undefined
  }

  async update(id: number, data: UpdateAppConfigData): Promise<AppConfig | undefined> {
    const updateData: any = {
      updatedAt: new Date()
    }
    
    if (data.totalPages !== undefined) {
      updateData.totalPages = data.totalPages
    }
    
    if (data.title !== undefined) {
      updateData.title = data.title
    }
    
    if (data.theme !== undefined) {
      // Merge with existing theme
      const existing = await this.findById(id)
      if (existing) {
        updateData.theme = JSON.stringify({
          ...existing.theme,
          ...data.theme
        })
      } else {
        updateData.theme = JSON.stringify(data.theme)
      }
    }
    
    await db(this.tableName).where({ id }).update(updateData)
    return this.findById(id)
  }

  async getOrCreateDefault(): Promise<AppConfig> {
    const existing = await this.findCurrent()
    if (existing) {
      return existing
    }
    
    // Create default configuration
    const defaultConfig: CreateAppConfigData = {
      totalPages: 0,
      title: 'Punjabi Religious Reader',
      theme: {
        primaryColor: '#FF9933',      // Saffron
        secondaryColor: '#1B365D',    // Deep Blue
        backgroundColor: '#FAF7F0',   // Cream
        fontFamily: 'Noto Sans Gurmukhi, Crimson Text'
      }
    }
    
    return this.create(defaultConfig)
  }
}