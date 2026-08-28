const multer = require('multer');
const path = require('path');
const fs = require('fs');

const tmpDir = path.join(__dirname, '..', 'storage', 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });

module.exports = multer({
  dest: tmpDir,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});
