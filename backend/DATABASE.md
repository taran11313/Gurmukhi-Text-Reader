# Database Documentation

## Overview

The Punjabi Religious Reader uses a database to store page metadata, user sessions, and application configuration. The system supports both SQLite (for development) and PostgreSQL (for production).

## Database Schema

### Tables

#### 1. Pages Table
Stores metadata for each PDF page that has been processed.

```sql
CREATE TABLE pages (
  id INTEGER PRIMARY KEY,
  pageNumber INTEGER NOT NULL UNIQUE,
  imageUrl VARCHAR(255) NOT NULL,
  thumbnailUrl VARCHAR(255) NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  processedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. User Sessions Table
Tracks user reading sessions and bookmarks.

```sql
CREATE TABLE user_sessions (
  sessionId VARCHAR(255) PRIMARY KEY,
  currentPage INTEGER NOT NULL DEFAULT 1,
  bookmarks JSON,
  lastVisited DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. App Config Table
Stores application configuration including theme settings.

```sql
CREATE TABLE app_config (
  id INTEGER PRIMARY KEY,
  totalPages INTEGER NOT NULL DEFAULT 0,
  title VARCHAR(255) NOT NULL DEFAULT 'Punjabi Religious Reader',
  theme JSON NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Database Commands

### Setup and Migration
```bash
# Initialize database and run migrations
npm run db:init

# Run migrations only
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Reset database (rollback all and re-migrate)
npm run db:reset

# Verify database schema
npm run db:verify
```

### Development vs Production

#### Development (SQLite)
- Database file: `backend/data/punjabi_reader.db`
- Automatically created when running `npm run db:init`
- No additional setup required

#### Production (PostgreSQL)
Set the following environment variables:
```bash
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=punjabi_reader
```

## Data Models

### Page Model
```typescript
interface Page {
  id: number
  pageNumber: number
  imageUrl: string
  thumbnailUrl: string
  width: number
  height: number
  processedAt: Date
}
```

### UserSession Model
```typescript
interface UserSession {
  sessionId: string
  currentPage: number
  lastVisited: Date
  bookmarks?: number[]
}
```

### AppConfig Model
```typescript
interface AppConfig {
  id: number
  totalPages: number
  title: string
  theme: {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
    fontFamily: string
  }
  createdAt: Date
  updatedAt: Date
}
```

## Repository Classes

### PageRepository
- `findAll()` - Get all pages ordered by page number
- `findByPageNumber(pageNumber)` - Find specific page
- `create(data)` - Create new page record
- `update(id, data)` - Update existing page
- `delete(id)` - Delete page record
- `getTotalPages()` - Get total page count
- `getPageRange(start, end)` - Get pages in range

### UserSessionRepository
- `findBySessionId(sessionId)` - Find session by ID
- `create(data)` - Create new session
- `update(sessionId, data)` - Update existing session
- `upsert(sessionId, data)` - Create or update session
- `delete(sessionId)` - Delete session
- `cleanupOldSessions(daysOld)` - Remove old sessions

### AppConfigRepository
- `findCurrent()` - Get current configuration
- `create(data)` - Create new configuration
- `update(id, data)` - Update configuration
- `getOrCreateDefault()` - Get existing or create default config

## Usage Examples

### Creating Pages
```typescript
import { PageRepository } from './repositories'

const pageRepo = new PageRepository()

const page = await pageRepo.create({
  pageNumber: 1,
  imageUrl: '/images/page-1.jpg',
  thumbnailUrl: '/images/thumb-1.jpg',
  width: 800,
  height: 1200
})
```

### Managing User Sessions
```typescript
import { UserSessionRepository } from './repositories'

const sessionRepo = new UserSessionRepository()

// Create or update session
const session = await sessionRepo.upsert('user-123', {
  currentPage: 25,
  bookmarks: [1, 10, 25, 50]
})
```

### Updating Configuration
```typescript
import { AppConfigRepository } from './repositories'

const configRepo = new AppConfigRepository()

const config = await configRepo.getOrCreateDefault()
await configRepo.update(config.id, {
  totalPages: 10000,
  theme: {
    primaryColor: '#FF9933'
  }
})
```

## Testing

The database setup includes comprehensive tests:

```bash
# Run all tests
npm test

# Run only repository tests
npm test -- src/tests/repositories

# Run integration tests
npm test -- src/tests/database.integration.test.ts
```

## Indexes

The following indexes are created for performance:
- `pages.pageNumber` - For fast page lookups
- `user_sessions.lastVisited` - For session cleanup queries

## Migration Files

Migration files are located in `src/migrations/` and follow the naming convention:
- `001_create_pages_table.ts`
- `002_create_user_sessions_table.ts`
- `003_create_app_config_table.ts`

Each migration includes both `up()` and `down()` functions for applying and rolling back changes.