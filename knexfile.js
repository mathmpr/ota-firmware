const path = require('path');
require('dotenv').config();

const sqliteConfig = {
  client: 'sqlite3',
  connection: {
    filename: process.env.DATABASE_PATH || path.join(__dirname, 'dev.sqlite3')
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'db/migrations')
  },
  seeds: {
    directory: path.join(__dirname, 'db/seeds')
  },
  pool: {
    afterCreate: (conn, done) => {
      conn.run('PRAGMA foreign_keys = ON', done);
    }
  }
};

module.exports = {
  development: sqliteConfig,
  production: sqliteConfig
};
