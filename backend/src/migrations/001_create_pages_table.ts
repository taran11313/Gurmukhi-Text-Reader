import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('pages', (table) => {
    table.increments('id').primary()
    table.integer('pageNumber').notNullable().unique()
    table.string('imageUrl').notNullable()
    table.string('thumbnailUrl').notNullable()
    table.integer('width').notNullable()
    table.integer('height').notNullable()
    table.timestamp('processedAt').defaultTo(knex.fn.now())
    
    // Index for faster page lookups
    table.index('pageNumber')
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('pages')
}