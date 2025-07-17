import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AppConfigRepository } from '../../repositories/AppConfigRepository'
import db from '../../config/database'

describe('AppConfigRepository', () => {
  let configRepo: AppConfigRepository

  beforeEach(async () => {
    configRepo = new AppConfigRepository()
    // Clean up test data
    await db('app_config').del()
  })

  afterEach(async () => {
    await db('app_config').del()
  })

  it('should create app configuration', async () => {
    const configData = {
      totalPages: 10000,
      title: 'Test Religious Reader',
      theme: {
        primaryColor: '#FF9933',
        secondaryColor: '#1B365D',
        backgroundColor: '#FAF7F0',
        fontFamily: 'Noto Sans Gurmukhi'
      }
    }

    const config = await configRepo.create(configData)
    
    expect(config).toBeDefined()
    expect(config.totalPages).toBe(10000)
    expect(config.title).toBe('Test Religious Reader')
    expect(config.theme.primaryColor).toBe('#FF9933')
    expect(config.createdAt).toBeInstanceOf(Date)
  })

  it('should get or create default configuration', async () => {
    const config = await configRepo.getOrCreateDefault()
    
    expect(config).toBeDefined()
    expect(config.title).toBe('Punjabi Religious Reader')
    expect(config.theme.primaryColor).toBe('#FF9933')
    expect(config.theme.secondaryColor).toBe('#1B365D')
    expect(config.theme.backgroundColor).toBe('#FAF7F0')
  })

  it('should update configuration', async () => {
    const initialConfig = await configRepo.getOrCreateDefault()
    
    const updatedConfig = await configRepo.update(initialConfig.id, {
      totalPages: 5000,
      title: 'Updated Title',
      theme: {
        primaryColor: '#FF0000'
      }
    })
    
    expect(updatedConfig).toBeDefined()
    expect(updatedConfig?.totalPages).toBe(5000)
    expect(updatedConfig?.title).toBe('Updated Title')
    expect(updatedConfig?.theme.primaryColor).toBe('#FF0000')
    // Should preserve other theme properties
    expect(updatedConfig?.theme.secondaryColor).toBe('#1B365D')
  })

  it('should find current configuration', async () => {
    await configRepo.getOrCreateDefault()
    
    const currentConfig = await configRepo.findCurrent()
    
    expect(currentConfig).toBeDefined()
    expect(currentConfig?.title).toBe('Punjabi Religious Reader')
  })
})