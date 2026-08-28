const Device = require('../models/Device');
const DeviceRequest = require('../models/DeviceRequest');

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket.remoteAddress;
}

function normalizeMac(mac) {
  return String(mac || '').trim().toUpperCase();
}

async function registerManifestRequest(req, board) {
  const mac = normalizeMac(req.query.mac || req.headers['x-device-mac']);
  if (!mac) {
    return { ok: false, status: 400, error: 'MAC address is required.' };
  }

  const ip = clientIp(req);
  const devicePayload = {
    mac,
    device_id: req.query.deviceId || null,
    board: board || null,
    last_ip: ip,
    last_seen_at: new Date()
  };

  let device = await Device.query().findOne({ mac });
  if (!device) {
    device = await Device.query().insert({
      ...devicePayload,
      first_ip: ip,
      first_seen_at: new Date()
    });

    await DeviceRequest.query().insert({
      device_id: device.id,
      mac,
      ip,
      method: req.method,
      path: req.path,
      query_json: JSON.stringify(req.query || {}),
      headers_json: JSON.stringify(redactHeaders(req.headers || {}))
    });
  } else {
    await Device.query().patchAndFetchById(device.id, devicePayload);
    device = await Device.query().findById(device.id);
  }

  return { ok: true, device };
}

function redactHeaders(headers) {
  const copy = { ...headers };
  delete copy.authorization;
  delete copy.cookie;
  return copy;
}

module.exports = {
  clientIp,
  normalizeMac,
  registerManifestRequest
};
