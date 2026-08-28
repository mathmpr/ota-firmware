const { Model } = require('objection');

class Firmware extends Model {
  static get tableName() {
    return 'firmwares';
  }
}

module.exports = Firmware;
