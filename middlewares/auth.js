module.exports = function auth(req, res, next) {
  if (!req.session.user) {
    res.redirect('/sign-in');
    return;
  }

  next();
};
