const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'ctf.db');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const exec = (sql) => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const init = async () => {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      total_score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      flag TEXT NOT NULL,
      points_base INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      challenge_id INTEGER NOT NULL,
      submitted_flag TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      time_taken INTEGER,
      points_earned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_score ON users(total_score DESC);
    CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON submissions(challenge_id);
  `);

  const challenges = [
    [1, 'Web Basics', 'Encontre a flag escondida no código fonte da página.', 'Web', 'Facil', 'CTF{web_basics_flag}', 25],
    [2, 'Crypto Intro', 'Decodifique a mensagem em Base64: Q1RGe2Jhc2U2NF9kZWNvZGV9', 'Criptografia', 'Facil', 'CTF{base64_decode}', 25],
    [3, 'Recon 101', 'Descubra o subdomínio oculto do alvo.', 'Reconhecimento', 'Facil', 'CTF{recon_done}', 25],
    [4, 'SQL Injection', 'Explore a vulnerabilidade de injeção SQL no login.', 'Web', 'Normal', 'CTF{sqli_master}', 25],
    [5, 'Buffer Overflow', 'Explore o buffer overflow no binário fornecido.', 'Pwn', 'Normal', 'CTF{bof_pwned}', 25],
    [6, 'Advanced Crypto', 'Quebre a criptografia RSA com chave fraca.', 'Criptografia', 'Dificil', 'CTF{rsa_broken}', 25]
  ];

  for (const c of challenges) {
    await run(
      'INSERT OR IGNORE INTO challenges (id, title, description, category, difficulty, flag, points_base) VALUES (?, ?, ?, ?, ?, ?, ?)',
      c
    );
  }
};

init().catch(console.error);

module.exports = { run, get, all, exec };