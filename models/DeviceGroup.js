const { Model } = require('objection');

class DeviceGroup extends Model {
  static get tableName() {
    return 'device_groups';
  }

  static get relationMappings() {
    const Device = require('./Device');
    const Firmware = require('./Firmware');

    return {
      devices: {
        relation: Model.HasManyRelation,
        modelClass: Device,
        join: {
          from: 'device_groups.id',
          to: 'devices.device_group_id'
        }
      },
      firmwares: {
        relation: Model.HasManyRelation,
        modelClass: Firmware,
        join: {
          from: 'device_groups.id',
          to: 'firmwares.device_group_id'
        }
      }
    };
  }
}

module.exports = DeviceGroup;
