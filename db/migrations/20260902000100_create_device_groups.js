exports.up = async function up(knex) {
  await knex.schema.alterTable('devices', (table) => {
    table.renameColumn('device_id', 'family_id');
  });

  await knex.schema.createTable('device_groups', (table) => {
    table.increments('id').primary();
    table.string('family_id').notNullable();
    table.string('board').notNullable();
    table.timestamps(true, true);
    table.unique(['family_id', 'board']);
  });

  await knex.schema.alterTable('devices', (table) => {
    table.integer('device_group_id').unsigned().nullable()
      .references('id').inTable('device_groups').onDelete('SET NULL');
    table.index(['device_group_id']);
  });

  const devices = await knex('devices')
    .whereNotNull('family_id')
    .whereNotNull('board')
    .select('id', 'family_id', 'board');

  for (const device of devices) {
    let group = await knex('device_groups')
      .where({ family_id: device.family_id, board: device.board })
      .first();

    if (!group) {
      const [id] = await knex('device_groups').insert({
        family_id: device.family_id,
        board: device.board
      });
      group = { id };
    }

    await knex('devices').where({ id: device.id }).update({ device_group_id: group.id });
  }

  const firmwares = await knex('firmwares')
    .join('devices', 'firmwares.device_id', 'devices.id')
    .select('firmwares.*', 'devices.device_group_id');

  await knex.schema.createTable('firmwares_new', (table) => {
    table.increments('id').primary();
    table.integer('device_group_id').unsigned().nullable()
      .references('id').inTable('device_groups').onDelete('CASCADE');
    table.string('version').notNullable();
    table.string('original_name').notNullable();
    table.string('stored_name').notNullable();
    table.string('storage_path').notNullable();
    table.integer('size').notNullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamps(true, true);
    table.index(['device_group_id', 'active']);
  });

  for (const firmware of firmwares) {
    await knex('firmwares_new').insert({
      id: firmware.id,
      device_group_id: firmware.device_group_id,
      version: firmware.version,
      original_name: firmware.original_name,
      stored_name: firmware.stored_name,
      storage_path: firmware.storage_path,
      size: firmware.size,
      active: firmware.active,
      created_at: firmware.created_at,
      updated_at: firmware.updated_at
    });
  }

  await knex.schema.dropTable('firmwares');
  await knex.schema.renameTable('firmwares_new', 'firmwares');
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('devices', (table) => {
    table.dropIndex(['device_group_id']);
    table.dropColumn('device_group_id');
  });

  await knex.schema.dropTableIfExists('device_groups');

  await knex.schema.alterTable('devices', (table) => {
    table.renameColumn('family_id', 'device_id');
  });
};
