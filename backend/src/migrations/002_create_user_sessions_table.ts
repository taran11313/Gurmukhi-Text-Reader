import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_sessions', (table) => {
    table.string('sessionId').primary()
    table.integer('currentPage').notNullable().defaultTo(1)
    table.json('bookmarks').nullable() // Store array of page numbers as JSON
    table.timestamp('lastVisited').defaultTo(knex.fn.now())
    
    // Index for faster session lookups
    table.index('lastVisited')
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_sessions')
}