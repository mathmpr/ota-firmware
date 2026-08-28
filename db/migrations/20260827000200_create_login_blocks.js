exports.up = async function up(knex) {
  await knex.schema.createTable('login_blocks', (table) => {
    table.increments('id').primary();
    table.string('ip').notNullable().unique();
    table.integer('failed_attempts').notNullable().defaultTo(0);
    table.timestamp('blocked_until').nullable();
    table.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('login_blocks');
};
