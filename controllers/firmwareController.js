const Device = require('../models/Device');
const { registerManifestRequest, normalizeMac } = require('../services/deviceService');
const { activeFirmwareForGroup } = require('../services/firmwareService');

function baseUrl(req) {
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get('host')}`;
}

function binaryQuery(device) {
  const params = new URLSearchParams();
  params.set('mac', device.mac);
  return params.toString();
}

function firmwareBasePath(req) {
  return req.originalUrl.startsWith('/api/') ? '/api/firmware' : '/firmware';
}

module.exports = {
  manifest: async (req, res) => {
    const board = String(req.params.board || '').trim().toLowerCase();
    const registered = await registerManifestRequest(req, board);
    if (!registered.ok) {
      res.status(registered.status).json({ error: registered.error });
      return;
    }

    if (!registered.device.device_group_id) {
      res.status(404).json({
        error: 'Device is not assigned to a firmware group yet.',
        mac: registered.device.mac,
        familyId: registered.device.family_id,
        board: registered.device.board
      });
      return;
    }

    const firmware = await activeFirmwareForGroup(registered.device.device_group_id);
    if (!firmware) {
      res.status(404).json({
        error: 'No firmware available for this device group yet.',
        mac: registered.device.mac,
        familyId: registered.device.family_id,
        board: registered.device.board
      });
      return;
    }

    res.json({
      version: firmware.version,
      binaryUrl: `${baseUrl(req)}${firmwareBasePath(req)}/${board}/binary?${binaryQuery(registered.device)}`,
      mac: registered.device.mac,
      familyId: registered.device.family_id,
      board
    });
  },

  binary: async (req, res) => {
    const mac = normalizeMac(req.query.mac || req.headers['x-device-mac']);
    if (!mac) {
      res.status(400).json({ error: 'MAC address is required.' });
      return;
    }

    const board = String(req.params.board || '').trim().toLowerCase();
    const device = await Device.query().findOne({ mac });
    if (!device) {
      res.status(404).json({ error: 'Device not registered.' });
      return;
    }

    if (!device.device_group_id || device.board !== board) {
      res.status(404).json({ error: 'Device is not registered for this board.' });
      return;
    }

    const firmware = await activeFirmwareForGroup(device.device_group_id);
    if (!firmware) {
      res.status(404).json({ error: 'No firmware available for this device group yet.' });
      return;
    }

    res.type('application/octet-stream');
    res.setHeader('Content-Length', String(firmware.size));
    res.setHeader('Content-Disposition', `attachment; filename="${firmware.original_name}"`);
    res.sendFile(firmware.storage_path);
  }
};
