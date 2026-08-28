exports.up = async function up(knex) {
  await knex.schema.createTable('firmwares', (table) => {
    table.increments('id').primary();
    table.integer('device_id').unsigned().notNullable().references('id').inTable('devices').onDelete('CASCADE');
    table.string('version').notNullable();
    table.string('original_name').notNullable();
    table.string('stored_name').notNullable();
    table.string('storage_path').notNullable();
    table.integer('size').notNullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('firmwares');
};
