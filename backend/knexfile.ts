import path from 'path'
import { Knex } from 'knex'

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'data/punjabi_reader.db')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src/migrations'),
      extension: 'ts'
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
      directory: path.join(__dirname, 'src/migrations'),
      extension: 'ts'
    }
  }
}

export default config