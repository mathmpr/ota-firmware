const bcrypt = require('bcrypt');

exports.seed = async function seed(knex) {
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@ota.local';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await knex('users').where({ email }).first();
  if (existing) {
    await knex('users').where({ id: existing.id }).update({
      name: 'Administrator',
      password_hash: passwordHash,
      updated_at: knex.fn.now()
    });
    return;
  }

  await knex('users').insert({
    email,
    name: 'Administrator',
    password_hash: passwordHash
  });
};
