import db from '../config/database'

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database schema...')
    
    // Check if tables exist
    const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'")
    console.log('📋 Tables found:', tables.map((t: any) => t.name))
    
    // Check pages table structure
    const pagesSchema = await db.raw("PRAGMA table_info(pages)")
    console.log('📄 Pages table schema:')
    pagesSchema.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`)
    })
    
    // Check user_sessions table structure
    const sessionsSchema = await db.raw("PRAGMA table_info(user_sessions)")
    console.log('👤 User sessions table schema:')
    sessionsSchema.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`)
    })
    
    // Check app_config table structure
    const configSchema = await db.raw("PRAGMA table_info(app_config)")
    console.log('⚙️ App config table schema:')
    configSchema.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`)
    })
    
    // Check indexes
    const indexes = await db.raw("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
    console.log('📊 Indexes found:')
    indexes.forEach((idx: any) => {
      console.log(`  - ${idx.name} on ${idx.tbl_name}`)
    })
    
    console.log('✅ Database schema verification completed!')
    
  } catch (error) {
    console.error('❌ Database verification failed:', error)
    throw error
  } finally {
    await db.destroy()
  }
}

// Run if called directly
if (require.main === module) {
  verifyDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export default verifyDatabase