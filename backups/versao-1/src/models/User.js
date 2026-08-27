const db = require('../utils/database');
const bcrypt = require('bcryptjs');

const User = {
  create: async (username, email, password) => {
    const hash = bcrypt.hashSync(password, 12);
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );
    return result.lastInsertRowid;
  },

  findByEmail: async (email) => {
    return await db.get('SELECT * FROM users WHERE email = ?', [email]);
  },

  findById: async (id) => {
    return await db.get('SELECT id, username, email, total_score, created_at FROM users WHERE id = ?', [id]);
  },

  findByUsername: async (username) => {
    return await db.get('SELECT * FROM users WHERE username = ?', [username]);
  },

  verifyPassword: (user, password) => {
    return bcrypt.compareSync(password, user.password_hash);
  },

  updateScore: async (userId, points) => {
    return await db.run('UPDATE users SET total_score = total_score + ? WHERE id = ?', [points, userId]);
  },

  getRanking: async (limit = 10) => {
    return await db.all('SELECT id, username, total_score FROM users ORDER BY total_score DESC LIMIT ?', [limit]);
  },

  getUserRank: async (userId) => {
    const result = await db.get(`
      SELECT COUNT(*) + 1 as rank FROM users WHERE total_score > (SELECT total_score FROM users WHERE id = ?)
    `, [userId]);
    return result;
  }
};

module.exports = User;