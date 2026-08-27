const db = require('../utils/database');

const Challenge = {
  getAll: async () => {
    return await db.all('SELECT id, title, description, category, difficulty, points_base FROM challenges ORDER BY difficulty, id');
  },

  getById: async (id) => {
    return await db.get('SELECT * FROM challenges WHERE id = ?', [id]);
  },

  getByCategory: async (category) => {
    return await db.all('SELECT id, title, description, category, difficulty, points_base FROM challenges WHERE category = ? ORDER BY difficulty, id', [category]);
  },

  getByDifficulty: async (difficulty) => {
    return await db.all('SELECT id, title, description, category, difficulty, points_base FROM challenges WHERE difficulty = ? ORDER BY id', [difficulty]);
  },

  verifyFlag: async (challengeId, submittedFlag) => {
    const challenge = await db.get('SELECT flag FROM challenges WHERE id = ?', [challengeId]);
    if (!challenge) return false;
    return challenge.flag === submittedFlag.trim();
  }
};

module.exports = Challenge;