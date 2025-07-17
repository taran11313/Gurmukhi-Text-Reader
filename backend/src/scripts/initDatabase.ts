import db from '../config/database'
import { AppConfigRepository } from '../repositories/AppConfigRepository'
import fs from 'fs-extra'
import path from 'path'

async function initDatabase() {
  try {
    console.log('🔧 Initializing database...')
    
    // Ensure data directory exists for SQLite
    const dataDir = path.join(__dirname, '../../data')
    await fs.ensureDir(dataDir)
    
    // Run migrations
    console.log('📦 Running database migrations...')
    await db.migrate.latest()
    
    // Initialize default app configuration
    console.log('⚙️ Setting up default configuration...')
    const appConfigRepo = new AppConfigRepository()
    await appConfigRepo.getOrCreateDefault()
    
    console.log('✅ Database initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    await db.destroy()
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export default initDatabase