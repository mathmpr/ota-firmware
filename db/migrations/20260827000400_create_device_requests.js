exports.up = async function up(knex) {
  await knex.schema.createTable('device_requests', (table) => {
    table.increments('id').primary();
    table.integer('device_id').unsigned().notNullable().references('id').inTable('devices').onDelete('CASCADE');
    table.string('mac').notNullable().unique();
    table.string('ip').nullable();
    table.string('method').notNullable();
    table.string('path').notNullable();
    table.text('query_json').nullable();
    table.text('headers_json').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('device_requests');
};
