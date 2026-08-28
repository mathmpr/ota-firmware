require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const knex = require('knex');
const { Model } = require('objection');

const knexConfig = require('./knexfile');
const firmwareController = require('./controllers/firmwareController');

const db = knex(knexConfig[process.env.NODE_ENV || 'development']);
Model.knex(db);

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'ota-firmware-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 6 * 60 * 60 * 1000
  }
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.flash = {
    success: req.flash('success'),
    error: req.flash('error'),
    info: req.flash('info')
  };
  res.locals.user = req.session.user || null;
  next();
});

app.use('/api', require('./routes/api'));
app.get('/firmware/:board/manifest.json', firmwareController.manifest);
app.get('/firmware/:board/binary', firmwareController.binary);
app.use('/', require('./routes/web'));

app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/firmware/')) {
    res.status(404).json({ error: 'Not found.' });
    return;
  }
  res.status(404).render('errors/404');
});

app.listen(port, () => {
  console.log(`OTA Firmware server listening on http://localhost:${port}`);
});
