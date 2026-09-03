const { Model } = require('objection');

class Device extends Model {
  static get tableName() {
    return 'devices';
  }

  static get relationMappings() {
    const DeviceRequest = require('./DeviceRequest');
    const DeviceGroup = require('./DeviceGroup');

    return {
      firstRequest: {
        relation: Model.HasOneRelation,
        modelClass: DeviceRequest,
        join: {
          from: 'devices.id',
          to: 'device_requests.device_id'
        }
      },
      group: {
        relation: Model.BelongsToOneRelation,
        modelClass: DeviceGroup,
        join: {
          from: 'devices.device_group_id',
          to: 'device_groups.id'
        }
      }
    };
  }
}

module.exports = Device;
