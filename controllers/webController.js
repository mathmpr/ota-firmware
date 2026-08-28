const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const User = require('../models/User');
const LoginBlock = require('../models/LoginBlock');
const Device = require('../models/Device');
const upload = require('../middlewares/upload');
const { clientIp } = require('../services/deviceService');
const { deleteFirmware, saveFirmware } = require('../services/firmwareService');

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
    const devices = await Device.query()
      .orderBy('last_seen_at', 'desc')
      .withGraphFetched('[firmwares, firstRequest]');

    res.render('admin/index', {
      devices,
      moment
    });
  },

  device: async (req, res) => {
    const device = await Device.query()
      .findById(req.params.id)
      .withGraphFetched('[firmwares, firstRequest]');

    if (!device) {
      res.status(404).render('errors/404');
      return;
    }

    res.render('admin/device', {
      device,
      moment
    });
  },

  uploadFirmware: [
    upload.single('firmware'),
    async (req, res) => {
      const device = await Device.query().findById(req.params.id);
      if (!device) {
        res.status(404).render('errors/404');
        return;
      }

      try {
        await saveFirmware(device, req.file, req.body.version);
        req.flash('success', 'Firmware publicado para este dispositivo.');
      } catch (error) {
        req.flash('error', error.message);
      }

      res.redirect(`/admin/devices/${device.id}`);
    }
  ],

  deleteFirmware: async (req, res) => {
    const device = await Device.query().findById(req.params.id);
    if (!device) {
      res.status(404).render('errors/404');
      return;
    }

    try {
      await deleteFirmware(device, req.params.firmwareId);
      req.flash('success', 'Firmware removido deste dispositivo.');
    } catch (error) {
      req.flash('error', error.message);
    }

    res.redirect(`/admin/devices/${device.id}`);
  }
};
