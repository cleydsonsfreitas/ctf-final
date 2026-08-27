const express = require('express');
const session = require('express-session');
const csrf = require('csurf');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { authMiddleware, guestMiddleware } = require('./middleware/auth');
const { validateRegistration, validateLogin, validateFlag } = require('./middleware/validation');
const { calculatePoints } = require('./utils/scoring');
const User = require('./models/User');
const Challenge = require('./models/Challenge');
const Submission = require('./models/Submission');
const db = require('./utils/database');

const app = express();
const PORT = 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    }
  }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  secret: 'ctf-fernando-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(csrf());

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Muitas requisições. Aguarde um momento.' }
});

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', guestMiddleware, (req, res) => {
  res.render('login', { errors: null, old: {}, csrfToken: req.csrfToken() });
});

app.post('/login', guestMiddleware, loginLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);

    if (!user || !User.verifyPassword(user, password)) {
      return res.render('login', { 
        errors: ['Credenciais inválidas'], 
        old: req.body, 
        csrfToken: req.csrfToken() 
      });
    }

    req.session.userId = user.id;
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('login', { errors: ['Erro interno'], old: req.body, csrfToken: req.csrfToken() });
  }
});

app.get('/register', guestMiddleware, (req, res) => {
  res.render('register', { errors: null, old: {}, csrfToken: req.csrfToken() });
});

app.post('/register', guestMiddleware, validateRegistration, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findByEmail(email) || await User.findByUsername(username);
    if (existingUser) {
      return res.render('register', { 
        errors: ['Usuário ou e-mail já cadastrado'], 
        old: req.body, 
        csrfToken: req.csrfToken() 
      });
    }

    const userId = await User.create(username, email, password);
    req.session.userId = userId;
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('register', { errors: ['Erro interno'], old: req.body, csrfToken: req.csrfToken() });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const challenges = await Challenge.getAll();
    const userRank = await User.getUserRank(req.user.id);
    const recentActivity = await Submission.getRecentActivity(10);
    
    res.render('dashboard', { 
      user: req.user, 
      challenges,
      userRank: userRank?.rank || 1,
      recentActivity,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Erro ao carregar dashboard' });
  }
});

app.get('/ranking', authMiddleware, async (req, res) => {
  try {
    const ranking = await User.getRanking(10);
    const userRank = await User.getUserRank(req.user.id);
    
    res.render('ranking', { 
      user: req.user, 
      ranking,
      userRank: userRank?.rank || 1,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Erro ao carregar ranking' });
  }
});

app.get('/activities', authMiddleware, async (req, res) => {
  try {
    const challenges = await Challenge.getAll();
    const solvedIds = new Set();
    
    const submissions = await Submission.getUserSubmissions(req.user.id);
    submissions.forEach(s => {
      if (s.is_correct) solvedIds.add(s.challenge_id);
    });
    
    res.render('activities', { 
      user: req.user, 
      challenges,
      solvedIds,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Erro ao carregar atividades' });
  }
});

app.get('/challenge/:id', authMiddleware, async (req, res) => {
  try {
    const challenge = await Challenge.getById(req.params.id);
    if (!challenge) return res.status(404).render('404', { user: req.user });
    
    const alreadySolved = await Submission.hasUserSolved(req.user.id, challenge.id);
    if (alreadySolved) {
      return res.render('challenge-solved', { user: req.user, challenge, csrfToken: req.csrfToken() });
    }
    
    const startTime = Date.now();
    req.session.challengeStart = req.session.challengeStart || {};
    req.session.challengeStart[challenge.id] = startTime;
    
    res.render('challenge', { 
      user: req.user, 
      challenge,
      startTime,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Erro ao carregar desafio' });
  }
});

app.post('/challenge/:id/submit', authMiddleware, apiLimiter, validateFlag, async (req, res) => {
  try {
    const challenge = await Challenge.getById(req.params.id);
    if (!challenge) return res.status(404).json({ success: false, message: 'Desafio não encontrado' });
    
    const alreadySolved = await Submission.hasUserSolved(req.user.id, challenge.id);
    if (alreadySolved) {
      return res.json({ success: false, message: 'Você já resolveu este desafio' });
    }
    
    const startTime = req.session.challengeStart?.[challenge.id] || Date.now();
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const isCorrect = await Challenge.verifyFlag(challenge.id, req.body.flag);
    
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = calculatePoints(timeTaken);
      await User.updateScore(req.user.id, pointsEarned);
    }
    
    await Submission.create(req.user.id, challenge.id, req.body.flag, isCorrect, timeTaken, pointsEarned);
    
    if (isCorrect) {
      delete req.session.challengeStart[challenge.id];
      return res.json({ 
        success: true, 
        message: 'Flag correta!', 
        points: pointsEarned,
        time: timeTaken,
        redirect: `/challenge/${challenge.id}/success`
      });
    }
    
    res.json({ success: false, message: 'Flag incorreta. Tente novamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

app.get('/api/user/solved-count', authMiddleware, async (req, res) => {
  try {
    const submissions = await Submission.getUserSubmissions(req.user.id);
    const count = submissions.filter(s => s.is_correct).length;
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/challenge/:id/success', authMiddleware, async (req, res) => {
  try {
    const challenge = await Challenge.getById(req.params.id);
    if (!challenge) return res.redirect('/dashboard');
    
    const lastSubmission = await db.get(`
      SELECT * FROM submissions 
      WHERE user_id = ? AND challenge_id = ? AND is_correct = 1 
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id, challenge.id]);
    
    res.render('success', { 
      user: req.user, 
      challenge,
      submission: lastSubmission,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Erro ao carregar página de sucesso' });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', { message: 'Token CSRF inválido. Recarregue a página.' });
  }
  res.status(500).render('error', { message: 'Erro interno do servidor' });
});

app.use((req, res) => {
  res.status(404).render('404', { user: req.user });
});

app.listen(PORT, () => {
  console.log(`🚀 CTF Fernando rodando em http://localhost:${PORT}`);
});

module.exports = app;