const User = require('../models/User');

const authMiddleware = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  
  const user = User.findById(req.session.userId);
  if (!user) {
    req.session.destroy();
    return res.redirect('/login');
  }
  
  req.user = user;
  next();
};

const guestMiddleware = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = { authMiddleware, guestMiddleware };