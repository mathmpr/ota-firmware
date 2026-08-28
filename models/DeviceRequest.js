const { Model } = require('objection');

class DeviceRequest extends Model {
  static get tableName() {
    return 'device_requests';
  }
}

module.exports = DeviceRequest;
