const db = require('../utils/database');

const Submission = {
  create: async (userId, challengeId, submittedFlag, isCorrect, timeTaken, pointsEarned) => {
    return await db.run(`
      INSERT INTO submissions (user_id, challenge_id, submitted_flag, is_correct, time_taken, points_earned)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, challengeId, submittedFlag, isCorrect ? 1 : 0, timeTaken, pointsEarned]);
  },

  getUserSubmissions: async (userId) => {
    return await db.all(`
      SELECT s.*, c.title, c.difficulty
      FROM submissions s
      JOIN challenges c ON s.challenge_id = c.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `, [userId]);
  },

  hasUserSolved: async (userId, challengeId) => {
    const result = await db.get('SELECT 1 FROM submissions WHERE user_id = ? AND challenge_id = ? AND is_correct = 1', [userId, challengeId]);
    return !!result;
  },

  getRecentActivity: async (limit = 20) => {
    return await db.all(`
      SELECT s.*, u.username, c.title, c.difficulty
      FROM submissions s
      JOIN users u ON s.user_id = u.id
      JOIN challenges c ON s.challenge_id = c.id
      WHERE s.is_correct = 1
      ORDER BY s.created_at DESC
      LIMIT ?
    `, [limit]);
  }
};

module.exports = Submission;