const validateRegistration = (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;
  const errors = [];

  if (!username || username.trim().length < 3) {
    errors.push('Nome de usuário deve ter pelo menos 3 caracteres');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('E-mail inválido');
  }
  if (!password || password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  if (password !== confirmPassword) {
    errors.push('Senhas não coincidem');
  }

  if (errors.length > 0) {
    return res.render('register', { errors, old: req.body, csrfToken: req.csrfToken() });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('E-mail inválido');
  }
  if (!password) {
    errors.push('Senha é obrigatória');
  }

  if (errors.length > 0) {
    return res.render('login', { errors, old: req.body, csrfToken: req.csrfToken() });
  }
  next();
};

const validateFlag = (req, res, next) => {
  const { flag } = req.body;
  if (!flag || flag.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Flag não pode estar vazia' });
  }
  next();
};

module.exports = { validateRegistration, validateLogin, validateFlag };