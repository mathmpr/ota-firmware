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
router.post('/admin/groups', auth, webController.createGroup);
router.get('/admin/devices/:id', auth, webController.device);
router.post('/admin/devices/:id/group', auth, webController.createGroupFromDevice);
router.post('/admin/devices/:id/delete', auth, webController.deleteDevice);
router.get('/admin/groups/:id', auth, webController.group);
router.post('/admin/groups/:id/edit', auth, webController.updateGroup);
router.post('/admin/groups/:id/delete', auth, webController.deleteGroup);
router.post('/admin/groups/:id/firmware', auth, webController.uploadGroupFirmware);
router.post('/admin/groups/:id/firmwares/:firmwareId/delete', auth, webController.deleteGroupFirmware);

module.exports = router;
