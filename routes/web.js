const express = require('express');
const auth = require('../middlewares/auth');
const signed = require('../middlewares/signed');
const webController = require('../controllers/webController');

const router = express.Router();

router.get('/', signed, webController.signIn);
router.get('/sign-in', signed, webController.signIn);
router.post('/sign-in', signed, webController.signInPost);
router.post('/sign-out', auth, webController.signOut);
router.get('/sign-up', signed, webController.signUp);
router.get('/admin', auth, webController.dashboard);
router.get('/admin/devices/:id', auth, webController.device);
router.post('/admin/devices/:id/firmware', auth, webController.uploadFirmware);
router.post('/admin/devices/:id/firmwares/:firmwareId/delete', auth, webController.deleteFirmware);

module.exports = router;
