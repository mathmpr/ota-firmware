const { Model } = require('objection');

class LoginBlock extends Model {
  static get tableName() {
    return 'login_blocks';
  }
}

module.exports = LoginBlock;
