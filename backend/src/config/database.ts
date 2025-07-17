import knex from 'knex'
import path from 'path'

const isDevelopment = process.env.NODE_ENV !== 'production'

const config = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../../data/punjabi_reader.db')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../migrations')
    }
  },
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'punjabi_reader'
    },
    migrations: {
      directory: path.join(__dirname, '../migrations')
    }
  }
}

const db = knex(isDevelopment ? config.development : config.production)

export default db