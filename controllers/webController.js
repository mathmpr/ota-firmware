const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const User = require('../models/User');
const LoginBlock = require('../models/LoginBlock');
const Device = require('../models/Device');
const DeviceGroup = require('../models/DeviceGroup');
const upload = require('../middlewares/upload');
const { clientIp } = require('../services/deviceService');
const { deleteFirmware, deleteGroup, saveFirmware } = require('../services/firmwareService');

const blockHours = 6;

async function currentBlock(ip) {
  const row = await LoginBlock.query().findOne({ ip });
  if (!row || !row.blocked_until) {
    return null;
  }

  const blockedUntil = new Date(row.blocked_until);
  if (blockedUntil <= new Date()) {
    await LoginBlock.query().deleteById(row.id);
    return null;
  }

  return blockedUntil;
}

async function registerFailure(ip) {
  let row = await LoginBlock.query().findOne({ ip });
  if (!row) {
    row = await LoginBlock.query().insert({ ip, failed_attempts: 0 });
  }

  const attempts = row.failed_attempts + 1;
  const patch = { failed_attempts: attempts, updated_at: new Date() };

  if (attempts >= 3) {
    patch.blocked_until = moment().add(blockHours, 'hours').toDate();
  }

  await LoginBlock.query().patchAndFetchById(row.id, patch);
  return patch.blocked_until || null;
}

async function clearFailures(ip) {
  await LoginBlock.query().delete().where({ ip });
}

module.exports = {
  signIn: async (_req, res) => {
    res.render('signIn');
  },

  signInPost: async (req, res) => {
    const ip = clientIp(req);
    const blockedUntil = await currentBlock(ip);
    if (blockedUntil) {
      req.flash('error', `IP bloqueado ate ${moment(blockedUntil).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm')}.`);
      res.redirect('/sign-in');
      return;
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.query().findOne({ email });
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!valid) {
      const until = await registerFailure(ip);
      if (until) {
        req.flash('error', `Credenciais invalidas. IP bloqueado por ${blockHours} horas.`);
      } else {
        req.flash('error', 'Credenciais invalidas.');
      }
      res.redirect('/sign-in');
      return;
    }

    await clearFailures(ip);
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };
    res.redirect('/admin');
  },

  signOut: (req, res) => {
    req.session.destroy(() => {
      res.redirect('/sign-in');
    });
  },

  signUp: (_req, res) => {
    res.render('signUp');
  },

  dashboard: async (_req, res) => {
    const groups = await DeviceGroup.query()
      .orderBy('created_at', 'desc')
      .withGraphFetched('[devices, firmwares]');
    const devices = await Device.query()
      .orderBy('last_seen_at', 'desc')
      .withGraphFetched('group');

    res.render('admin/index', {
      groups,
      devices,
      moment
    });
  },

  createGroup: async (req, res) => {
    const familyId = String(req.body.familyId || '').trim();
    const board = String(req.body.board || '').trim().toLowerCase();

    if (!familyId || !board) {
      req.flash('error', 'Family ID e placa sao obrigatorios.');
      res.redirect('/admin');
      return;
    }

    let group = await DeviceGroup.query().findOne({ family_id: familyId, board });
    if (!group) {
      group = await DeviceGroup.query().insert({ family_id: familyId, board });
      req.flash('success', 'Grupo criado.');
    } else {
      req.flash('info', 'Esse grupo ja existe.');
    }

    res.redirect(`/admin/groups/${group.id}`);
  },

  device: async (req, res) => {
    const device = await Device.query().findById(req.params.id).withGraphFetched('group');
    if (!device) {
      res.status(404).render('errors/404');
      return;
    }

    res.render('admin/device', { device, moment });
  },

  createGroupFromDevice: async (req, res) => {
    const device = await Device.query().findById(req.params.id);
    if (!device) {
      res.status(404).render('errors/404');
      return;
    }
    if (!device.family_id || !device.board) {
      req.flash('error', 'O device ainda nao informou Family ID e placa.');
      res.redirect(`/admin/devices/${device.id}`);
      return;
    }

    let group = await DeviceGroup.query().findOne({
      family_id: device.family_id,
      board: device.board
    });
    if (!group) {
      group = await DeviceGroup.query().insert({
        family_id: device.family_id,
        board: device.board
      });
      req.flash('success', 'Grupo criado e device associado.');
    } else {
      req.flash('success', 'Device associado ao grupo existente.');
    }

    await Device.query().patchAndFetchById(device.id, { device_group_id: group.id });
    res.redirect(`/admin/groups/${group.id}`);
  },

  deleteDevice: async (req, res) => {
    const device = await Device.query().findById(req.params.id);
    if (!device) {
      res.status(404).render('errors/404');
      return;
    }

    await Device.query().deleteById(device.id);
    req.flash('success', 'Device removido. Um novo manifesto desse MAC criara outro cadastro.');
    res.redirect('/admin');
  },

  group: async (req, res) => {
    const group = await DeviceGroup.query()
      .findById(req.params.id)
      .withGraphFetched('[devices, firmwares]');

    if (!group) {
      res.status(404).render('errors/404');
      return;
    }

    res.render('admin/group', {
      group,
      moment
    });
  },

  updateGroup: async (req, res) => {
    const group = await DeviceGroup.query().findById(req.params.id);
    if (!group) {
      res.status(404).render('errors/404');
      return;
    }

    const familyId = String(req.body.familyId || '').trim();
    const board = String(req.body.board || '').trim().toLowerCase();
    if (!familyId || !board) {
      req.flash('error', 'Family ID e placa sao obrigatorios.');
      res.redirect(`/admin/groups/${group.id}`);
      return;
    }

    const duplicate = await DeviceGroup.query().findOne({ family_id: familyId, board });
    if (duplicate && duplicate.id !== group.id) {
      req.flash('error', 'Ja existe um grupo com esta Family ID e placa.');
      res.redirect(`/admin/groups/${group.id}`);
      return;
    }

    await DeviceGroup.transaction(async (trx) => {
      await DeviceGroup.query(trx).patchAndFetchById(group.id, {
        family_id: familyId,
        board,
        updated_at: new Date()
      });
      await Device.query(trx)
        .where({ device_group_id: group.id })
        .patch({ family_id: familyId, board, updated_at: new Date() });
    });

    req.flash('success', 'Grupo atualizado.');
    res.redirect(`/admin/groups/${group.id}`);
  },

  deleteGroup: async (req, res) => {
    const group = await DeviceGroup.query().findById(req.params.id);
    if (!group) {
      res.status(404).render('errors/404');
      return;
    }

    try {
      await deleteGroup(group);
      req.flash('success', 'Grupo e firmwares removidos. Os devices ficaram sem grupo.');
      res.redirect('/admin');
    } catch (error) {
      req.flash('error', error.message);
      res.redirect(`/admin/groups/${group.id}`);
    }
  },

  uploadGroupFirmware: [
    upload.single('firmware'),
    async (req, res) => {
      const group = await DeviceGroup.query().findById(req.params.id);
      if (!group) {
        res.status(404).render('errors/404');
        return;
      }

      try {
        await saveFirmware(group, req.file, req.body.version);
        req.flash('success', 'Firmware publicado para este grupo.');
      } catch (error) {
        req.flash('error', error.message);
      }

      res.redirect(`/admin/groups/${group.id}`);
    }
  ],

  deleteGroupFirmware: async (req, res) => {
    const group = await DeviceGroup.query().findById(req.params.id);
    if (!group) {
      res.status(404).render('errors/404');
      return;
    }

    try {
      await deleteFirmware(group, req.params.firmwareId);
      req.flash('success', 'Firmware removido deste grupo.');
    } catch (error) {
      req.flash('error', error.message);
    }

    res.redirect(`/admin/groups/${group.id}`);
  }
};
