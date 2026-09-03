const fs = require('fs/promises');
const path = require('path');
const Firmware = require('../models/Firmware');
const DeviceGroup = require('../models/DeviceGroup');

function storageRoot() {
  return path.resolve(process.env.FIRMWARE_STORAGE_PATH || path.join(__dirname, '..', 'storage', 'firmwares'));
}

function maxFirmwareSizeForBoard(board) {
  const normalizedBoard = String(board || '').trim().toLowerCase();
  if (normalizedBoard === 'esp8266') {
    return 470 * 1024;
  }

  return null;
}

async function activeFirmwareForGroup(groupId) {
  return Firmware.query()
    .where({ device_group_id: groupId, active: true })
    .orderBy('created_at', 'desc')
    .first();
}

async function moveUploadedFile(sourcePath, targetPath) {
  try {
    await fs.rename(sourcePath, targetPath);
  } catch (error) {
    if (error.code !== 'EXDEV') {
      throw error;
    }

    await fs.copyFile(sourcePath, targetPath);
    await fs.unlink(sourcePath);
  }
}

async function saveFirmware(group, file, version) {
  const cleanVersion = String(version || '').trim();
  if (!cleanVersion) {
    throw new Error('Version is required.');
  }
  if (!file) {
    throw new Error('Firmware binary is required.');
  }

  const handle = await fs.open(file.path, 'r');
  const header = Buffer.alloc(1);
  const { bytesRead } = await handle.read(header, 0, 1, 0);
  await handle.close();
  if (bytesRead !== 1 || header[0] !== 0xE9) {
    await fs.unlink(file.path).catch(() => {});
    throw new Error('Invalid ESP firmware binary. Expected a .bin file starting with magic byte 0xE9.');
  }

  const maxSize = maxFirmwareSizeForBoard(group.board);
  if (maxSize !== null && file.size > maxSize) {
    await fs.unlink(file.path).catch(() => {});
    throw new Error(`Firmware is too large for ${group.board}. Max: ${maxSize} bytes. Received: ${file.size} bytes.`);
  }

  const dir = path.join(storageRoot(), 'groups', String(group.id));
  await fs.mkdir(dir, { recursive: true });

  const extension = path.extname(file.originalname || '') || '.bin';
  const storedName = `firmware-${Date.now()}${extension}`;
  const targetPath = path.join(dir, storedName);

  await moveUploadedFile(file.path, targetPath);

  await Firmware.query()
    .where({ device_group_id: group.id, active: true })
    .patch({ active: false, updated_at: new Date() });

  return Firmware.query().insert({
    device_group_id: group.id,
    version: cleanVersion,
    original_name: file.originalname || storedName,
    stored_name: storedName,
    storage_path: targetPath,
    size: file.size,
    active: true
  });
}

async function deleteFirmware(group, firmwareId) {
  const firmware = await Firmware.query()
    .where({ id: firmwareId, device_group_id: group.id })
    .first();

  if (!firmware) {
    throw new Error('Firmware nao encontrado para este grupo.');
  }

  await Firmware.query().deleteById(firmware.id);

  try {
    await fs.unlink(firmware.storage_path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (firmware.active) {
    const latest = await Firmware.query()
      .where({ device_group_id: group.id })
      .orderBy('created_at', 'desc')
      .first();

    if (latest) {
      await Firmware.query().patchAndFetchById(latest.id, {
        active: true,
        updated_at: new Date()
      });
    }
  }
}

async function deleteGroup(group) {
  const firmwares = await Firmware.query().where({ device_group_id: group.id });

  for (const firmware of firmwares) {
    try {
      await fs.unlink(firmware.storage_path);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  await DeviceGroup.query().deleteById(group.id);
  await fs.rm(path.join(storageRoot(), 'groups', String(group.id)), {
    recursive: true,
    force: true
  });
}

module.exports = {
  activeFirmwareForGroup,
  deleteFirmware,
  deleteGroup,
  saveFirmware,
  storageRoot
};
