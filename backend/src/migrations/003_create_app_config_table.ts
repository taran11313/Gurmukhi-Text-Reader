import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('app_config', (table) => {
    table.increments('id').primary()
    table.integer('totalPages').notNullable().defaultTo(0)
    table.string('title').notNullable().defaultTo('Punjabi Religious Reader')
    table.json('theme').notNullable() // Store theme configuration as JSON
    table.timestamp('createdAt').defaultTo(knex.fn.now())
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('app_config')
}