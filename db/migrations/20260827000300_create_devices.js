exports.up = async function up(knex) {
  await knex.schema.createTable('devices', (table) => {
    table.increments('id').primary();
    table.string('mac').notNullable().unique();
    table.string('device_id').nullable();
    table.string('board').nullable();
    table.string('first_ip').nullable();
    table.string('last_ip').nullable();
    table.timestamp('first_seen_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('devices');
};
