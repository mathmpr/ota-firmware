const express = require('express');
const firmwareController = require('../controllers/firmwareController');

const router = express.Router();

router.get('/health', (_req, res) => res.json({ ok: true }));
router.get('/firmware/:board/manifest.json', firmwareController.manifest);
router.get('/firmware/:board/binary', firmwareController.binary);

module.exports = router;
