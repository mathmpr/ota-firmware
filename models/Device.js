const { Model } = require('objection');

class Device extends Model {
  static get tableName() {
    return 'devices';
  }

  static get relationMappings() {
    const Firmware = require('./Firmware');
    const DeviceRequest = require('./DeviceRequest');

    return {
      firmwares: {
        relation: Model.HasManyRelation,
        modelClass: Firmware,
        join: {
          from: 'devices.id',
          to: 'firmwares.device_id'
        }
      },
      firstRequest: {
        relation: Model.HasOneRelation,
        modelClass: DeviceRequest,
        join: {
          from: 'devices.id',
          to: 'device_requests.device_id'
        }
      }
    };
  }
}

module.exports = Device;
