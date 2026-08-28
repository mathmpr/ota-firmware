module.exports = function signed(req, res, next) {
  if (req.session.user) {
    res.redirect('/admin');
    return;
  }

  next();
};
