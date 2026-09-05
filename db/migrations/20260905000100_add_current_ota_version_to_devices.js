exports.up = async function up(knex) {
  await knex.schema.alterTable('devices', (table) => {
    table.string('current_ota_version').nullable();
    table.timestamp('current_ota_version_reported_at').nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('devices', (table) => {
    table.dropColumn('current_ota_version_reported_at');
    table.dropColumn('current_ota_version');
  });
};
