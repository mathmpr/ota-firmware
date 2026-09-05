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

function normalizeFamilyId(familyId) {
  return String(familyId || '').trim();
}

function currentOtaVersion(req) {
  const version = req.query.CURRENT_OTA_VERSION ?? req.query.current_ota_version;
  return String(version || '').trim() || null;
}

async function registerManifestRequest(req, board) {
  const mac = normalizeMac(req.query.mac || req.headers['x-device-mac']);
  if (!mac) {
    return { ok: false, status: 400, error: 'MAC address is required.' };
  }

  const familyId = normalizeFamilyId(req.query.familyId);
  if (!familyId) {
    return { ok: false, status: 400, error: 'Family ID is required.' };
  }
  if (!board) {
    return { ok: false, status: 400, error: 'Board is required.' };
  }

  let device = await Device.query().findOne({ mac });
  const ip = clientIp(req);
  const devicePayload = {
    mac,
    family_id: familyId,
    board,
    last_ip: ip,
    last_seen_at: new Date()
  };

  const reportedVersion = currentOtaVersion(req);
  if (reportedVersion) {
    devicePayload.current_ota_version = reportedVersion;
    devicePayload.current_ota_version_reported_at = new Date();
  }

  if (device && (device.family_id !== familyId || device.board !== board)) {
    devicePayload.device_group_id = null;
  }

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
  normalizeFamilyId,
  currentOtaVersion,
  registerManifestRequest
};
